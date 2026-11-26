import path from "node:path";
import type { z } from "zod";
import { renderCycleAudit } from "../../contracts/src/render.ts";
import {
  CycleAuditReportSchema,
  CycleCriticReportSchema,
  DoctrineReviewReportSchema,
  FixReportSchema,
  ReviewReportSchema,
  type CycleAuditReport,
  type CycleCriticReport,
  type DoctrineReviewReport,
  type FixReport,
  type ReviewReport,
} from "../../contracts/src/report-schemas.ts";
import {
  countReviewFixes,
  isDoctrineReviewFilename,
  validateCycleAudit,
  validateCycleCritic,
  validateDoctrineReview,
  type CycleAuditJustifiedMachineryRef,
  type CycleAuditReviewFindingRef,
} from "../../contracts/src/report-validate.ts";
import type { Spec } from "../../contracts/src/spec-schema.ts";
import {
  buildAuditorBrief,
  buildCriticBrief,
  buildFixerBrief,
  buildGateCriticBrief,
  buildGateFixerBrief,
  buildRereviewBrief,
  buildReviewBrief,
  buildSecondCriticBrief,
  buildSecondFixerBrief,
} from "./briefs.ts";
import {
  MAX_LINES_PER_LIST,
  MAX_PATHS_PER_LIST,
  assignNewPathsToSlices,
  planFixSlices,
  sortNewPaths,
  validateSlices,
  type SliceMerge,
} from "./slices.ts";
import type { CycleAction, CycleRound, CycleState, ReviewTask, SpawnSubagent } from "./state.ts";

export type RawReportEntry =
  | { exists: false }
  | { exists: true; parseError: string }
  | { exists: true; raw: unknown };

export type CycleAdvanceEnv = {
  spec: Spec | null;
  scope: ReadonlyArray<string>;
  leftOut: ReadonlyArray<string>;
  uncommitted: ReadonlyArray<string>;
  existingPaths: ReadonlySet<string>;
  fileLines?: Readonly<Record<string, number>>;
  slicesYaml: RawReportEntry;
  reports: ReadonlyMap<string, RawReportEntry>;
  reviewFindingsForAudit: ReadonlyArray<CycleAuditReviewFindingRef>;
  justifiedMachineryForAudit?: ReadonlyArray<CycleAuditJustifiedMachineryRef>;
  gateLog: string | null;
};

export type CycleEffects = {
  writeSlices?: Record<string, string[]>;
  writeStackFiles?: {
    backend: string[][];
    frontend: string[][];
  };
  writeMerges?: {
    round: CycleRound;
    merges: SliceMerge[];
  };
  writeHitPaths?: {
    round: CycleRound;
    paths: string[];
  };
  writeScope?: string[];
  writeLeftOut?: string[];
  writeFixedList?: {
    filename: string;
    paths: string[];
  };
  updateSpec?: {
    builtPieces: string[];
    status?: "built";
  };
  renderReport?: {
    reportPath: string;
    markdown: string;
  };
};

export type CycleAdvanceResult = {
  state: CycleState;
  action: CycleAction;
  effects: CycleEffects;
};

type ParsedReport<T> = { ok: true; data: T } | { ok: false; issues: string[] };

const formatZodIssues = (error: z.ZodError): string[] =>
  error.issues.map((issue) => {
    const loc = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${loc}: ${issue.message}`;
  });

const parseReport = <T>(
  reports: ReadonlyMap<string, RawReportEntry>,
  filename: string,
  schema: z.ZodType<T>,
  extraValidate?: (data: T) => Array<{ path: string; message: string }>,
): ParsedReport<T> => {
  const entry = reports.get(filename);
  if (entry === undefined || !entry.exists) {
    return { ok: false, issues: [`${filename} is missing`] };
  }
  if ("parseError" in entry) {
    return { ok: false, issues: [entry.parseError] };
  }
  const parsed = schema.safeParse(entry.raw);
  if (!parsed.success) {
    return { ok: false, issues: formatZodIssues(parsed.error) };
  }
  if (extraValidate !== undefined) {
    const issues = extraValidate(parsed.data);
    if (issues.length > 0) {
      return {
        ok: false,
        issues: issues.map((issue) => `${issue.path}: ${issue.message}`),
      };
    }
  }
  return { ok: true, data: parsed.data };
};

const cloneState = (state: CycleState): CycleState => ({
  ...state,
  slices: Object.fromEntries(Object.entries(state.slices).map(([k, v]) => [k, [...v]])),
  stackFiles: {
    backend: [...state.stackFiles.backend],
    frontend: [...state.stackFiles.frontend],
  },
  retries: { ...state.retries },
  committedLists: [...state.committedLists],
  missedReports: [...state.missedReports],
});

const addMissedReport = (state: CycleState, reportFile: string): void => {
  if (!state.missedReports.includes(reportFile)) {
    state.missedReports.push(reportFile);
  }
};

const isMissed = (state: CycleState, reportFile: string): boolean =>
  state.missedReports.includes(reportFile);

const buildSliceAction = (
  state: CycleState,
  errors: string[],
  fileLines?: Readonly<Record<string, number>>,
): CycleAction => ({
  action: "slice",
  scopeFile: path.join(state.runDir, "scope.txt"),
  slicesFile: path.join(state.runDir, "slices.yaml"),
  fileLines: fileLines !== undefined ? { ...fileLines } : {},
  schema: {
    slices: "[{ id: <positive int>, files: [<1..25 repo-relative paths>] }]",
    stacks: {
      backend: "[[<1..25 repo-relative paths>]]",
      frontend: "[[<1..25 repo-relative paths>]]",
    },
    maxPerFile: MAX_PATHS_PER_LIST,
    maxLinesPerList: MAX_LINES_PER_LIST,
  },
  errors,
});

const buildCommitAction = (
  state: CycleState,
  listFilename: string,
  changes: string[],
): CycleAction => ({
  action: "commit",
  listFile: path.join(state.runDir, listFilename),
  messageFile: path.join(state.runDir, "message.txt"),
  diffStat: "",
  changes,
  commitRule: path.join(state.skillDir, "references", "commits.md"),
  specPath: state.specPath,
});

const buildGateAction = (state: CycleState): CycleAction => ({
  action: "gate",
  logFile: path.join(state.runDir, "gate.log"),
});

const spawnAuditor = (state: CycleState): CycleAdvanceResult => {
  state.phase = { kind: "auditing" };
  return {
    state,
    action: {
      action: "spawn",
      parallel: false,
      subagents: [
        {
          role: "auditor",
          brief: buildAuditorBrief(state),
          report: path.join(state.runDir, "audit.yaml"),
        },
      ],
    },
    effects: {},
  };
};

const startRoundOneReviews = (state: CycleState, effects: CycleEffects): CycleAdvanceResult => {
  const tasks: ReviewTask[] = [];
  const sliceIds = Object.keys(state.slices)
    .map((key) => Number(key))
    .filter((id) => Number.isInteger(id) && id >= 0)
    .sort((a, b) => a - b);

  for (const id of sliceIds) {
    tasks.push({
      role: "reviewer",
      listFile: `slice-${id}.txt`,
      reportFile: `review-1-slice-${id}.yaml`,
    });
  }

  for (let i = 0; i < state.stackFiles.backend.length; i += 1) {
    const listFile = state.stackFiles.backend[i];
    if (listFile !== undefined) {
      tasks.push({
        role: "doctrine-reviewer-backend",
        listFile,
        reportFile: `review-1-backend-${i + 1}.yaml`,
      });
    }
  }

  for (let i = 0; i < state.stackFiles.frontend.length; i += 1) {
    const listFile = state.stackFiles.frontend[i];
    if (listFile !== undefined) {
      tasks.push({
        role: "doctrine-reviewer-frontend",
        listFile,
        reportFile: `review-1-frontend-${i + 1}.yaml`,
      });
    }
  }

  state.phase = { kind: "reviewing", tasks };
  const subagents: SpawnSubagent[] = tasks.map((task) => ({
    role: task.role,
    brief: buildReviewBrief(state, task.role, task.listFile, task.reportFile),
    report: path.join(state.runDir, task.reportFile),
  }));

  return {
    state,
    action: {
      action: "spawn",
      parallel: subagents.length > 1,
      subagents,
    },
    effects,
  };
};

const parseReviewOrDoctrineReport = (
  reports: ReadonlyMap<string, RawReportEntry>,
  filename: string,
  isDoctrine: boolean,
): ParsedReport<ReviewReport> =>
  isDoctrine
    ? parseReport<DoctrineReviewReport>(
        reports,
        filename,
        DoctrineReviewReportSchema,
        validateDoctrineReview,
      )
    : parseReport(reports, filename, ReviewReportSchema);

const collectRoundReviewReports = (
  state: CycleState,
  reports: ReadonlyMap<string, RawReportEntry>,
  round: CycleRound,
): { names: string[]; parsed: ReviewReport[] } => {
  const prefix = `review-${round}-`;
  const names = [...reports.keys()]
    .filter((name) => name.startsWith(prefix) && name.endsWith(".yaml") && !isMissed(state, name))
    .sort();

  const validNames: string[] = [];
  const parsed: ReviewReport[] = [];

  for (const name of names) {
    const res = parseReviewOrDoctrineReport(reports, name, isDoctrineReviewFilename(name));
    if (res.ok) {
      validNames.push(name);
      parsed.push(res.data);
    }
  }

  return { names: validNames, parsed };
};

const collectRoundFixReports = (
  state: CycleState,
  reports: ReadonlyMap<string, RawReportEntry>,
  round: CycleRound,
): Array<{ sliceId: number; filename: string; data: FixReport }> => {
  const pattern = new RegExp(`^fix-${round}-slice-(\\d+)(-b)?\\.yaml$`);
  const results: Array<{ sliceId: number; filename: string; data: FixReport }> = [];

  const names = [...reports.keys()].sort();
  for (const name of names) {
    if (isMissed(state, name)) {
      continue;
    }
    const match = pattern.exec(name);
    if (match === null) {
      continue;
    }
    const sliceId = Number(match[1]);
    const res = parseReport(reports, name, FixReportSchema);
    if (res.ok) {
      results.push({ sliceId, filename: name, data: res.data });
    }
  }

  return results;
};

const extractFixedChanges = (fixReports: ReadonlyArray<FixReport>): string[] => {
  const changes: string[] = [];
  for (const report of fixReports) {
    for (const result of report.results) {
      if (result.status === "FIXED") {
        changes.push(result.change);
      }
    }
  }
  return changes;
};

const startRoundFixesOrGate = (
  state: CycleState,
  env: CycleAdvanceEnv,
  effects: CycleEffects,
): CycleAdvanceResult => {
  const { names, parsed } = collectRoundReviewReports(state, env.reports, state.round);
  const totalFixes = parsed.reduce((sum, report) => sum + countReviewFixes(report), 0);

  if (totalFixes === 0) {
    state.phase = { kind: "gate" };
    return {
      state,
      action: buildGateAction(state),
      effects,
    };
  }

  const plan = planFixSlices(state.slices, parsed, new Set(env.leftOut), env.existingPaths);
  state.slices = plan.slices;
  effects.writeSlices = plan.slices;
  if (plan.merges.length > 0) {
    effects.writeMerges = { round: state.round, merges: plan.merges };
  }
  effects.writeHitPaths = { round: state.round, paths: plan.hitPaths };

  if (plan.hitSliceIds.length === 0) {
    state.phase = { kind: "gate" };
    return {
      state,
      action: buildGateAction(state),
      effects,
    };
  }

  state.phase = {
    kind: "fixing",
    sliceIds: plan.hitSliceIds,
    reviewReports: names,
  };

  const subagents: SpawnSubagent[] = plan.hitSliceIds.map((sliceId) => {
    const reportFile = `fix-${state.round}-slice-${sliceId}.yaml`;
    return {
      role: "fixer",
      brief: buildFixerBrief(state, state.round, sliceId, names),
      report: path.join(state.runDir, reportFile),
    };
  });

  return {
    state,
    action: {
      action: "spawn",
      parallel: subagents.length > 1,
      subagents,
    },
    effects,
  };
};

const startRereviewOrGate = (
  state: CycleState,
  env: CycleAdvanceEnv,
  effects: CycleEffects,
): CycleAdvanceResult => {
  const roundFixes = collectRoundFixReports(state, env.reports, state.round);
  const allFixerChanged: string[] = [];
  const fixerChangedBySlice: Record<string, string[]> = {};

  for (const entry of roundFixes) {
    const key = String(entry.sliceId);
    const list = fixerChangedBySlice[key] ?? [];
    for (const filePath of entry.data.changedFiles) {
      allFixerChanged.push(filePath);
      if (!list.includes(filePath)) {
        list.push(filePath);
      }
    }
    fixerChangedBySlice[key] = list;
  }

  const sorted = sortNewPaths(env.uncommitted, env.scope, env.leftOut, allFixerChanged);

  if (sorted.addedToScope.length > 0) {
    effects.writeScope = sorted.scope;
  }
  if (sorted.addedToLeftOut.length > 0) {
    effects.writeLeftOut = sorted.leftOut;
  }

  const fixedListFile = `fixed-${state.round}.txt`;
  effects.writeFixedList = { filename: fixedListFile, paths: sorted.fixed };

  if (sorted.fixed.length === 0) {
    state.phase = { kind: "gate" };
    return {
      state,
      action: buildGateAction(state),
      effects,
    };
  }

  const updatedSlices = assignNewPathsToSlices(sorted.fixed, state.slices, fixerChangedBySlice);
  state.slices = updatedSlices;
  effects.writeSlices = updatedSlices;

  const reportFile = `review-${state.round + 1}-fixes.yaml`;
  state.phase = {
    kind: "rereviewing",
    fixedListFile,
    reportFile,
  };

  return {
    state,
    action: {
      action: "spawn",
      parallel: false,
      subagents: [
        {
          role: "reviewer",
          brief: buildRereviewBrief(state, fixedListFile, reportFile),
          report: path.join(state.runDir, reportFile),
        },
      ],
    },
    effects,
  };
};

const spawnCriticForIndex = (
  state: CycleState,
  env: CycleAdvanceEnv,
  sliceIds: number[],
  currentIndex: number,
  reviewReports: string[],
  failedSliceIds: number[],
  effects: CycleEffects,
): CycleAdvanceResult => {
  const sliceId = sliceIds[currentIndex];
  if (sliceId === undefined) {
    return startRereviewOrGate(state, env, effects);
  }
  const fixReportFile = `fix-${state.round}-slice-${sliceId}.yaml`;
  const fixEntry = env.reports.get(fixReportFile);
  const includeFix = !isMissed(state, fixReportFile) && fixEntry !== undefined && fixEntry.exists;
  const criticReportFile = `critic-${state.round}-slice-${sliceId}.yaml`;

  state.phase = {
    kind: "critiquing",
    sliceIds,
    currentIndex,
    reviewReports,
    failedSliceIds,
  };

  return {
    state,
    action: {
      action: "spawn",
      parallel: false,
      subagents: [
        {
          role: "critic",
          brief: buildCriticBrief(state, state.round, sliceId, reviewReports, includeFix),
          report: path.join(state.runDir, criticReportFile),
        },
      ],
    },
    effects,
  };
};

const spawnSecondFixerForIndex = (
  state: CycleState,
  env: CycleAdvanceEnv,
  sliceIds: number[],
  currentIndex: number,
  reviewReports: string[],
  effects: CycleEffects,
): CycleAdvanceResult => {
  const sliceId = sliceIds[currentIndex];
  if (sliceId === undefined) {
    return startRereviewOrGate(state, env, effects);
  }
  const criticReportFile = `critic-${state.round}-slice-${sliceId}.yaml`;
  const criticEntry = env.reports.get(criticReportFile);
  const includeCritic =
    !isMissed(state, criticReportFile) && criticEntry !== undefined && criticEntry.exists;
  const secondFixReportFile = `fix-${state.round}-slice-${sliceId}-b.yaml`;

  state.phase = {
    kind: "second_fixing",
    sliceIds,
    currentIndex,
    reviewReports,
  };

  return {
    state,
    action: {
      action: "spawn",
      parallel: false,
      subagents: [
        {
          role: "fixer",
          brief: buildSecondFixerBrief(state, state.round, sliceId, reviewReports, includeCritic),
          report: path.join(state.runDir, secondFixReportFile),
        },
      ],
    },
    effects,
  };
};

const spawnSecondCriticForIndex = (
  state: CycleState,
  env: CycleAdvanceEnv,
  sliceIds: number[],
  currentIndex: number,
  reviewReports: string[],
  effects: CycleEffects,
): CycleAdvanceResult => {
  const sliceId = sliceIds[currentIndex];
  if (sliceId === undefined) {
    return startRereviewOrGate(state, env, effects);
  }
  const firstFixFile = `fix-${state.round}-slice-${sliceId}.yaml`;
  const secondFixFile = `fix-${state.round}-slice-${sliceId}-b.yaml`;
  const firstFixEntry = env.reports.get(firstFixFile);
  const secondFixEntry = env.reports.get(secondFixFile);
  const includeFirstFix =
    !isMissed(state, firstFixFile) && firstFixEntry !== undefined && firstFixEntry.exists;
  const includeSecondFix =
    !isMissed(state, secondFixFile) && secondFixEntry !== undefined && secondFixEntry.exists;
  const secondCriticFile = `critic-${state.round}-slice-${sliceId}-b.yaml`;

  state.phase = {
    kind: "second_critiquing",
    sliceIds,
    currentIndex,
    reviewReports,
  };

  return {
    state,
    action: {
      action: "spawn",
      parallel: false,
      subagents: [
        {
          role: "critic",
          brief: buildSecondCriticBrief(
            state,
            state.round,
            sliceId,
            reviewReports,
            includeFirstFix,
            includeSecondFix,
          ),
          report: path.join(state.runDir, secondCriticFile),
        },
      ],
    },
    effects,
  };
};

export type GateLogVerdict =
  | { kind: "pass" }
  | { kind: "fail"; exitCode: number }
  | { kind: "malformed" };

export const parseGateLog = (content: string): GateLogVerdict => {
  const lines = content.split(/\r?\n/);
  const firstLine = lines[0]?.trim() ?? "";
  if (
    firstLine.startsWith("GATE: none named") ||
    firstLine.startsWith("GATE: task could not list Taskfile.yml")
  ) {
    return { kind: "pass" };
  }

  const nonEmpty = lines.map((line) => line.trim()).filter((line) => line.length > 0);
  const lastNonEmpty = nonEmpty[nonEmpty.length - 1] ?? "";
  const match = /^GATE EXIT (-?\d+)$/.exec(lastNonEmpty);
  if (match === null) {
    return { kind: "malformed" };
  }
  const exitCode = Number(match[1]);
  if (exitCode === 0) {
    return { kind: "pass" };
  }
  return { kind: "fail", exitCode };
};

export const advanceCycle = (inputState: CycleState, env: CycleAdvanceEnv): CycleAdvanceResult => {
  const state = cloneState(inputState);
  const effects: CycleEffects = {};

  switch (state.phase.kind) {
    case "done":
      return {
        state,
        action: { action: "relay", report: state.phase.reportPath },
        effects,
      };

    case "stopped":
      return {
        state,
        action: {
          action: "stop",
          reason: state.phase.reason,
          details: state.phase.details.length > 0 ? state.phase.details : undefined,
        },
        effects,
      };

    case "await_slices": {
      if (!env.slicesYaml.exists) {
        return {
          state,
          action: buildSliceAction(state, state.phase.errors, env.fileLines),
          effects,
        };
      }
      if ("parseError" in env.slicesYaml) {
        const errors = [env.slicesYaml.parseError];
        state.phase = { kind: "await_slices", errors };
        return {
          state,
          action: buildSliceAction(state, errors, env.fileLines),
          effects,
        };
      }
      const validated = validateSlices(env.slicesYaml.raw, env.scope, env.fileLines);
      if (!validated.ok) {
        state.phase = { kind: "await_slices", errors: validated.errors };
        return {
          state,
          action: buildSliceAction(state, validated.errors, env.fileLines),
          effects,
        };
      }

      const slicesMap: Record<string, string[]> = {};
      for (const entry of validated.data.slices) {
        slicesMap[String(entry.id)] = [...entry.files];
      }
      state.slices = slicesMap;
      state.stackFiles = {
        backend: validated.data.stacks.backend.map((_, idx) => `stack-backend-${idx + 1}.txt`),
        frontend: validated.data.stacks.frontend.map((_, idx) => `stack-frontend-${idx + 1}.txt`),
      };
      effects.writeSlices = slicesMap;
      effects.writeStackFiles = validated.data.stacks;

      return startRoundOneReviews(state, effects);
    }

    case "review_ready":
      return startRoundOneReviews(state, effects);

    case "reviewing": {
      const toRetry: SpawnSubagent[] = [];
      for (const task of state.phase.tasks) {
        if (isMissed(state, task.reportFile)) {
          continue;
        }
        const parsed = parseReviewOrDoctrineReport(
          env.reports,
          task.reportFile,
          task.role !== "reviewer" || isDoctrineReviewFilename(task.reportFile),
        );
        if (parsed.ok) {
          continue;
        }
        const attempts = state.retries[task.reportFile] ?? 0;
        if (attempts < 1) {
          state.retries[task.reportFile] = attempts + 1;
          toRetry.push({
            role: task.role,
            brief: buildReviewBrief(state, task.role, task.listFile, task.reportFile),
            report: path.join(state.runDir, task.reportFile),
          });
        } else {
          addMissedReport(state, task.reportFile);
        }
      }

      if (toRetry.length > 0) {
        return {
          state,
          action: {
            action: "spawn",
            parallel: toRetry.length > 1,
            subagents: toRetry,
          },
          effects,
        };
      }

      state.phase = { kind: "commit_work" };
      return {
        state,
        action: buildCommitAction(state, "scope.txt", []),
        effects,
      };
    }

    case "commit_work": {
      if (!state.committedLists.includes("scope.txt")) {
        return {
          state,
          action: buildCommitAction(state, "scope.txt", []),
          effects,
        };
      }
      return startRoundFixesOrGate(state, env, effects);
    }

    case "fixing": {
      const { sliceIds, reviewReports } = state.phase;
      const toRetry: SpawnSubagent[] = [];

      for (const sliceId of sliceIds) {
        const reportFile = `fix-${state.round}-slice-${sliceId}.yaml`;
        if (isMissed(state, reportFile)) {
          continue;
        }
        const parsed = parseReport(env.reports, reportFile, FixReportSchema);
        if (parsed.ok) {
          continue;
        }
        const attempts = state.retries[reportFile] ?? 0;
        if (attempts < 1) {
          state.retries[reportFile] = attempts + 1;
          toRetry.push({
            role: "fixer",
            brief: buildFixerBrief(state, state.round, sliceId, reviewReports),
            report: path.join(state.runDir, reportFile),
          });
        } else {
          addMissedReport(state, reportFile);
        }
      }

      if (toRetry.length > 0) {
        return {
          state,
          action: {
            action: "spawn",
            parallel: toRetry.length > 1,
            subagents: toRetry,
          },
          effects,
        };
      }

      return spawnCriticForIndex(state, env, sliceIds, 0, reviewReports, [], effects);
    }

    case "critiquing": {
      const { sliceIds, currentIndex, reviewReports } = state.phase;
      const failedSliceIds = [...state.phase.failedSliceIds];
      const sliceId = sliceIds[currentIndex];
      if (sliceId === undefined) {
        return startRereviewOrGate(state, env, effects);
      }

      const reportFile = `critic-${state.round}-slice-${sliceId}.yaml`;
      if (!isMissed(state, reportFile)) {
        const parsed = parseReport<CycleCriticReport>(
          env.reports,
          reportFile,
          CycleCriticReportSchema,
          validateCycleCritic,
        );
        if (!parsed.ok) {
          const attempts = state.retries[reportFile] ?? 0;
          if (attempts < 1) {
            state.retries[reportFile] = attempts + 1;
            return spawnCriticForIndex(
              state,
              env,
              sliceIds,
              currentIndex,
              reviewReports,
              failedSliceIds,
              effects,
            );
          }
          // Critic missed twice: do not spawn a second fixer for this slice.
          addMissedReport(state, reportFile);
        } else if (parsed.data.verdict === "FAIL") {
          if (!failedSliceIds.includes(sliceId)) {
            failedSliceIds.push(sliceId);
          }
        }
      }

      if (currentIndex + 1 < sliceIds.length) {
        return spawnCriticForIndex(
          state,
          env,
          sliceIds,
          currentIndex + 1,
          reviewReports,
          failedSliceIds,
          effects,
        );
      }

      if (failedSliceIds.length > 0) {
        return spawnSecondFixerForIndex(state, env, failedSliceIds, 0, reviewReports, effects);
      }

      return startRereviewOrGate(state, env, effects);
    }

    case "second_fixing": {
      const { sliceIds, currentIndex, reviewReports } = state.phase;
      const sliceId = sliceIds[currentIndex];
      if (sliceId === undefined) {
        return startRereviewOrGate(state, env, effects);
      }

      const reportFile = `fix-${state.round}-slice-${sliceId}-b.yaml`;
      if (!isMissed(state, reportFile)) {
        const parsed = parseReport(env.reports, reportFile, FixReportSchema);
        if (!parsed.ok) {
          const attempts = state.retries[reportFile] ?? 0;
          if (attempts < 1) {
            state.retries[reportFile] = attempts + 1;
            return spawnSecondFixerForIndex(
              state,
              env,
              sliceIds,
              currentIndex,
              reviewReports,
              effects,
            );
          }
          addMissedReport(state, reportFile);
        }
      }

      return spawnSecondCriticForIndex(state, env, sliceIds, currentIndex, reviewReports, effects);
    }

    case "second_critiquing": {
      const { sliceIds, currentIndex, reviewReports } = state.phase;
      const sliceId = sliceIds[currentIndex];
      if (sliceId === undefined) {
        return startRereviewOrGate(state, env, effects);
      }

      const reportFile = `critic-${state.round}-slice-${sliceId}-b.yaml`;
      if (!isMissed(state, reportFile)) {
        const parsed = parseReport<CycleCriticReport>(
          env.reports,
          reportFile,
          CycleCriticReportSchema,
          validateCycleCritic,
        );
        if (!parsed.ok) {
          const attempts = state.retries[reportFile] ?? 0;
          if (attempts < 1) {
            state.retries[reportFile] = attempts + 1;
            return spawnSecondCriticForIndex(
              state,
              env,
              sliceIds,
              currentIndex,
              reviewReports,
              effects,
            );
          }
          addMissedReport(state, reportFile);
        }
      }

      // Never a third fixer for one slice in one round.
      if (currentIndex + 1 < sliceIds.length) {
        return spawnSecondFixerForIndex(
          state,
          env,
          sliceIds,
          currentIndex + 1,
          reviewReports,
          effects,
        );
      }

      return startRereviewOrGate(state, env, effects);
    }

    case "rereviewing": {
      const { fixedListFile, reportFile } = state.phase;
      if (!isMissed(state, reportFile)) {
        const parsed = parseReport(env.reports, reportFile, ReviewReportSchema);
        if (!parsed.ok) {
          const attempts = state.retries[reportFile] ?? 0;
          if (attempts < 1) {
            state.retries[reportFile] = attempts + 1;
            return {
              state,
              action: {
                action: "spawn",
                parallel: false,
                subagents: [
                  {
                    role: "reviewer",
                    brief: buildRereviewBrief(state, fixedListFile, reportFile),
                    report: path.join(state.runDir, reportFile),
                  },
                ],
              },
              effects,
            };
          }
          addMissedReport(state, reportFile);
        }
      }

      const roundFixes = collectRoundFixReports(state, env.reports, state.round);
      const changes = extractFixedChanges(roundFixes.map((entry) => entry.data));

      state.phase = { kind: "commit_round", fixedListFile };
      return {
        state,
        action: buildCommitAction(state, fixedListFile, changes),
        effects,
      };
    }

    case "commit_round": {
      const { fixedListFile } = state.phase;
      if (!state.committedLists.includes(fixedListFile)) {
        const roundFixes = collectRoundFixReports(state, env.reports, state.round);
        const changes = extractFixedChanges(roundFixes.map((entry) => entry.data));
        return {
          state,
          action: buildCommitAction(state, fixedListFile, changes),
          effects,
        };
      }

      if (state.round === 3) {
        state.phase = { kind: "gate" };
        return {
          state,
          action: buildGateAction(state),
          effects,
        };
      }

      state.round = state.round === 1 ? 2 : 3;
      return startRoundFixesOrGate(state, env, effects);
    }

    case "gate": {
      if (env.gateLog === null) {
        return {
          state,
          action: buildGateAction(state),
          effects,
        };
      }

      const verdict = parseGateLog(env.gateLog);
      if (verdict.kind === "pass") {
        return spawnAuditor(state);
      }

      if (verdict.kind === "malformed") {
        const reason = "Malformed gate.log: missing recognized GATE sentinel line";
        const details = [path.join(state.runDir, "gate.log")];
        state.phase = { kind: "stopped", reason, details };
        return {
          state,
          action: { action: "stop", reason, details },
          effects,
        };
      }

      state.phase = { kind: "gate_fixing" };
      return {
        state,
        action: {
          action: "spawn",
          parallel: false,
          subagents: [
            {
              role: "fixer",
              brief: buildGateFixerBrief(state),
              report: path.join(state.runDir, "fix-gate.yaml"),
            },
          ],
        },
        effects,
      };
    }

    case "gate_fixing": {
      const reportFile = "fix-gate.yaml";
      if (!isMissed(state, reportFile)) {
        const parsed = parseReport(env.reports, reportFile, FixReportSchema);
        if (!parsed.ok) {
          const attempts = state.retries[reportFile] ?? 0;
          if (attempts < 1) {
            state.retries[reportFile] = attempts + 1;
            return {
              state,
              action: {
                action: "spawn",
                parallel: false,
                subagents: [
                  {
                    role: "fixer",
                    brief: buildGateFixerBrief(state),
                    report: path.join(state.runDir, reportFile),
                  },
                ],
              },
              effects,
            };
          }
          addMissedReport(state, reportFile);
        }
      }

      const fixGateEntry = env.reports.get(reportFile);
      const includeFixGate =
        !isMissed(state, reportFile) && fixGateEntry !== undefined && fixGateEntry.exists;

      state.phase = { kind: "gate_critiquing" };
      return {
        state,
        action: {
          action: "spawn",
          parallel: false,
          subagents: [
            {
              role: "critic",
              brief: buildGateCriticBrief(state, includeFixGate),
              report: path.join(state.runDir, "critic-gate.yaml"),
            },
          ],
        },
        effects,
      };
    }

    case "gate_critiquing": {
      const reportFile = "critic-gate.yaml";
      if (!isMissed(state, reportFile)) {
        const parsed = parseReport<CycleCriticReport>(
          env.reports,
          reportFile,
          CycleCriticReportSchema,
          validateCycleCritic,
        );
        if (!parsed.ok) {
          const attempts = state.retries[reportFile] ?? 0;
          if (attempts < 1) {
            state.retries[reportFile] = attempts + 1;
            const fixGateEntry = env.reports.get("fix-gate.yaml");
            const includeFixGate =
              !isMissed(state, "fix-gate.yaml") &&
              fixGateEntry !== undefined &&
              fixGateEntry.exists;
            return {
              state,
              action: {
                action: "spawn",
                parallel: false,
                subagents: [
                  {
                    role: "critic",
                    brief: buildGateCriticBrief(state, includeFixGate),
                    report: path.join(state.runDir, reportFile),
                  },
                ],
              },
              effects,
            };
          }
          addMissedReport(state, reportFile);
        }
      }

      const gateFixParsed = isMissed(state, "fix-gate.yaml")
        ? null
        : parseReport(env.reports, "fix-gate.yaml", FixReportSchema);
      const gateChangedFiles =
        gateFixParsed !== null && gateFixParsed.ok ? gateFixParsed.data.changedFiles : [];

      const sorted = sortNewPaths(env.uncommitted, env.scope, env.leftOut, gateChangedFiles);
      if (sorted.addedToScope.length > 0) {
        effects.writeScope = sorted.scope;
      }
      if (sorted.addedToLeftOut.length > 0) {
        effects.writeLeftOut = sorted.leftOut;
      }

      const fixedListFile = "fixed-gate.txt";
      effects.writeFixedList = { filename: fixedListFile, paths: sorted.fixed };

      if (sorted.fixed.length === 0) {
        const auditRes = spawnAuditor(state);
        return {
          ...auditRes,
          effects,
        };
      }

      const changes =
        gateFixParsed !== null && gateFixParsed.ok ? extractFixedChanges([gateFixParsed.data]) : [];
      state.phase = { kind: "commit_gate", fixedListFile };
      return {
        state,
        action: buildCommitAction(state, fixedListFile, changes),
        effects,
      };
    }

    case "commit_gate": {
      const { fixedListFile } = state.phase;
      if (!state.committedLists.includes(fixedListFile)) {
        const gateFixParsed = isMissed(state, "fix-gate.yaml")
          ? null
          : parseReport(env.reports, "fix-gate.yaml", FixReportSchema);
        const changes =
          gateFixParsed !== null && gateFixParsed.ok
            ? extractFixedChanges([gateFixParsed.data])
            : [];
        return {
          state,
          action: buildCommitAction(state, fixedListFile, changes),
          effects,
        };
      }

      // Never run the gate a second time.
      return spawnAuditor(state);
    }

    case "auditing": {
      const reportFile = "audit.yaml";
      const parsed = parseReport<CycleAuditReport>(
        env.reports,
        reportFile,
        CycleAuditReportSchema,
        (data) =>
          validateCycleAudit(data, {
            spec: env.spec ?? undefined,
            reviewFindings: env.reviewFindingsForAudit,
            justifiedMachinery: env.justifiedMachineryForAudit,
          }),
      );

      if (!parsed.ok) {
        const attempts = state.retries[reportFile] ?? 0;
        if (attempts < 1) {
          state.retries[reportFile] = attempts + 1;
          return {
            state,
            action: {
              action: "spawn",
              parallel: false,
              subagents: [
                {
                  role: "auditor",
                  brief: buildAuditorBrief(state),
                  report: path.join(state.runDir, reportFile),
                },
              ],
            },
            effects,
          };
        }

        const reason = "Auditor failed twice to produce a valid audit.yaml";
        const details = [state.runDir, ...parsed.issues];
        state.phase = { kind: "stopped", reason, details };
        return {
          state,
          action: { action: "stop", reason, details },
          effects,
        };
      }

      const reportPath = path.join(state.runDir, "report.md");
      effects.renderReport = {
        reportPath,
        markdown: renderCycleAudit(parsed.data),
      };

      if (state.specPath !== null && env.spec !== null) {
        effects.updateSpec = {
          builtPieces: [...parsed.data.builtPieces],
          status: parsed.data.specStatus.status === "built" ? "built" : undefined,
        };
      }

      state.phase = { kind: "done", reportPath };
      return {
        state,
        action: { action: "relay", report: reportPath },
        effects,
      };
    }
  }
};
