import path from "node:path";
import type { z } from "zod";
import { renderGoAudit } from "../../contracts/src/render.ts";
import {
  type BuildReport,
  BuildReportSchema,
  type GoAuditReport,
  GoAuditReportSchema,
  type GoCriticReport,
  GoCriticReportSchema,
} from "../../contracts/src/report-schemas.ts";
import { validateGoAudit, validateGoCritic } from "../../contracts/src/report-validate.ts";
import type { Spec, ValidationIssue } from "../../contracts/src/spec-schema.ts";
import {
  AUDIT_REPORT_FILE_NAME,
  auditorBrief,
  type BriefPaths,
  builderBrief,
  buildReportFileName,
  criticBrief,
  criticReportFileName,
  RENDERED_REPORT_FILE_NAME,
} from "./briefs.ts";
import type { GoAction, GoState, GoSubagentTask } from "./state.ts";

export type DiskReportEntry = { kind: "ok"; data: unknown } | { kind: "read-error"; error: string };

export type ReportsOnDisk = Readonly<Record<string, DiskReportEntry>>;

export type TransitionResult = {
  state: GoState;
  action: GoAction;
  specBuiltPieces?: string[];
  renderedReportMd?: string;
};

type ParsedReport<T> = { ok: true; report: T } | { ok: false; issues: string[] };

const formatZodPath = (pathParts: ReadonlyArray<PropertyKey>): string => {
  if (pathParts.length === 0) {
    return "(root)";
  }
  return pathParts
    .map((part, index) => {
      if (typeof part === "number") {
        return `[${part}]`;
      }
      const key = String(part);
      return index === 0 ? key : `.${key}`;
    })
    .join("");
};

const formatZodIssues = (error: z.ZodError): string[] =>
  error.issues.map((issue) => `${formatZodPath(issue.path)}: ${issue.message}`);

const formatValidationIssues = (issues: ReadonlyArray<ValidationIssue>): string[] =>
  issues.map((issue) => `${issue.path}: ${issue.message}`);

const retryKey = (role: "build" | "critic", pieceId: string, attempt: 1 | 2): string =>
  `${role}:${pieceId}:${attempt}`;

const AUDIT_RETRY_KEY = "audit";

const addUnique = (items: ReadonlyArray<string>, item: string): string[] =>
  items.includes(item) ? [...items] : [...items, item];

const mergeUnique = (items: ReadonlyArray<string>, additions: ReadonlyArray<string>): string[] => {
  const result = [...items];
  for (const item of additions) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
};

const pathsFromState = (state: GoState): BriefPaths => ({
  skillDir: state.skillDir,
  specPath: state.specPath,
  runDir: state.runDir,
});

const parseBuildReport = (
  reportsOnDisk: ReportsOnDisk,
  pieceId: string,
  attempt: 1 | 2,
): ParsedReport<BuildReport> => {
  const fileName = buildReportFileName(pieceId, attempt);
  const entry = reportsOnDisk[fileName];
  if (entry === undefined) {
    return { ok: false, issues: [`${fileName}: file not found`] };
  }
  if (entry.kind === "read-error") {
    return { ok: false, issues: [entry.error] };
  }

  const parsed = BuildReportSchema.safeParse(entry.data);
  if (!parsed.success) {
    return { ok: false, issues: formatZodIssues(parsed.error) };
  }

  const issues: string[] = [];
  if (parsed.data.piece !== pieceId) {
    issues.push(`piece: expected "${pieceId}", got "${parsed.data.piece}"`);
  }
  if (parsed.data.attempt !== attempt) {
    issues.push(`attempt: expected ${attempt}, got ${parsed.data.attempt}`);
  }
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, report: parsed.data };
};

const parseCriticReport = (
  reportsOnDisk: ReportsOnDisk,
  pieceId: string,
  attempt: 1 | 2,
): ParsedReport<GoCriticReport> => {
  const fileName = criticReportFileName(pieceId, attempt);
  const entry = reportsOnDisk[fileName];
  if (entry === undefined) {
    return { ok: false, issues: [`${fileName}: file not found`] };
  }
  if (entry.kind === "read-error") {
    return { ok: false, issues: [entry.error] };
  }

  const parsed = GoCriticReportSchema.safeParse(entry.data);
  if (!parsed.success) {
    return { ok: false, issues: formatZodIssues(parsed.error) };
  }

  const issues: string[] = [];
  if (parsed.data.piece !== pieceId) {
    issues.push(`piece: expected "${pieceId}", got "${parsed.data.piece}"`);
  }
  if (parsed.data.attempt !== attempt) {
    issues.push(`attempt: expected ${attempt}, got ${parsed.data.attempt}`);
  }
  issues.push(...formatValidationIssues(validateGoCritic(parsed.data)));
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, report: parsed.data };
};

const parseAuditReport = (
  reportsOnDisk: ReportsOnDisk,
  spec: Spec,
): ParsedReport<GoAuditReport> => {
  const entry = reportsOnDisk[AUDIT_REPORT_FILE_NAME];
  if (entry === undefined) {
    return { ok: false, issues: [`${AUDIT_REPORT_FILE_NAME}: file not found`] };
  }
  if (entry.kind === "read-error") {
    return { ok: false, issues: [entry.error] };
  }

  const parsed = GoAuditReportSchema.safeParse(entry.data);
  if (!parsed.success) {
    return { ok: false, issues: formatZodIssues(parsed.error) };
  }

  const issues = formatValidationIssues(validateGoAudit(parsed.data, spec));
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, report: parsed.data };
};

export const selectReadyPieces = (
  spec: Spec,
  builtPieces: ReadonlyArray<string>,
  failedPieces: ReadonlyArray<string>,
): string[] => {
  const builtSet = new Set(builtPieces);
  const failedSet = new Set(failedPieces);
  return spec.pieces
    .filter(
      (piece) =>
        !builtSet.has(piece.id) &&
        !failedSet.has(piece.id) &&
        piece.after.every((dep) => builtSet.has(dep)),
    )
    .map((piece) => piece.id);
};

const startNextRoundOrAudit = (
  state: GoState,
  spec: Spec,
  builtPieces: ReadonlyArray<string>,
  specBuiltPiecesUpdate: string[] | undefined,
): TransitionResult => {
  const paths = pathsFromState(state);
  const ready = selectReadyPieces(spec, builtPieces, state.failedPieces);

  if (ready.length > 0) {
    const subagents: GoSubagentTask[] = ready.map((pieceId) => ({
      role: "builder",
      piece: pieceId,
      attempt: 1,
      brief: builderBrief(paths, pieceId, 1),
    }));
    const nextState: GoState = {
      ...state,
      phase: { kind: "building", pieces: ready },
    };
    return {
      state: nextState,
      action: {
        action: "spawn",
        parallel: subagents.length > 1,
        subagents,
      },
      ...(specBuiltPiecesUpdate !== undefined ? { specBuiltPieces: specBuiltPiecesUpdate } : {}),
    };
  }

  const nextState: GoState = {
    ...state,
    phase: { kind: "auditing" },
  };
  return {
    state: nextState,
    action: {
      action: "spawn",
      parallel: false,
      subagents: [
        {
          role: "auditor",
          piece: "all",
          brief: auditorBrief(paths),
        },
      ],
    },
    ...(specBuiltPiecesUpdate !== undefined ? { specBuiltPieces: specBuiltPiecesUpdate } : {}),
  };
};

const startNextRetryOrRound = (
  state: GoState,
  spec: Spec,
  retryQueue: ReadonlyArray<string>,
  builtPieces: ReadonlyArray<string>,
  specBuiltPiecesUpdate: string[] | undefined,
): TransitionResult => {
  const [nextPiece, ...rest] = retryQueue;
  if (nextPiece !== undefined) {
    const paths = pathsFromState(state);
    const nextState: GoState = {
      ...state,
      phase: { kind: "retrying_build", piece: nextPiece, queue: rest },
    };
    return {
      state: nextState,
      action: {
        action: "spawn",
        parallel: false,
        subagents: [
          {
            role: "builder",
            piece: nextPiece,
            attempt: 2,
            brief: builderBrief(paths, nextPiece, 2),
          },
        ],
      },
      ...(specBuiltPiecesUpdate !== undefined ? { specBuiltPieces: specBuiltPiecesUpdate } : {}),
    };
  }

  return startNextRoundOrAudit(state, spec, builtPieces, specBuiltPiecesUpdate);
};

const advanceCritiqueQueue = (
  state: GoState,
  spec: Spec,
  queue: ReadonlyArray<string>,
  retryQueue: ReadonlyArray<string>,
  builtPieces: ReadonlyArray<string>,
  specBuiltPiecesUpdate: string[] | undefined,
): TransitionResult => {
  const [nextPiece, ...rest] = queue;
  if (nextPiece !== undefined) {
    const paths = pathsFromState(state);
    const nextState: GoState = {
      ...state,
      phase: {
        kind: "critiquing",
        piece: nextPiece,
        queue: rest,
        retryQueue: [...retryQueue],
      },
    };
    return {
      state: nextState,
      action: {
        action: "spawn",
        parallel: false,
        subagents: [
          {
            role: "critic",
            piece: nextPiece,
            attempt: 1,
            brief: criticBrief(paths, nextPiece, 1),
          },
        ],
      },
      ...(specBuiltPiecesUpdate !== undefined ? { specBuiltPieces: specBuiltPiecesUpdate } : {}),
    };
  }

  return startNextRetryOrRound(state, spec, retryQueue, builtPieces, specBuiltPiecesUpdate);
};

export const advanceGo = (
  state: GoState,
  spec: Spec,
  reportsOnDisk: ReportsOnDisk,
): TransitionResult => {
  const paths = pathsFromState(state);
  const phase = state.phase;

  if (phase.kind === "done") {
    return {
      state,
      action: { action: "relay", report: phase.reportPath },
    };
  }

  if (phase.kind === "stopped") {
    return {
      state,
      action: {
        action: "stop",
        reason: phase.reason,
        ...(phase.details !== undefined ? { details: phase.details } : {}),
      },
    };
  }

  if (phase.kind === "idle") {
    return startNextRoundOrAudit(state, spec, spec.builtPieces, undefined);
  }

  if (phase.kind === "building") {
    const needsRetry: string[] = [];
    const builtForCritique: string[] = [];
    const newlyFailed: string[] = [];

    for (const pieceId of phase.pieces) {
      const parsed = parseBuildReport(reportsOnDisk, pieceId, 1);
      if (parsed.ok) {
        if (parsed.report.result === "BUILT") {
          builtForCritique.push(pieceId);
        } else {
          newlyFailed.push(pieceId);
        }
      } else {
        const key = retryKey("build", pieceId, 1);
        const count = state.retries[key] ?? 0;
        if (count < 1) {
          needsRetry.push(pieceId);
        } else {
          newlyFailed.push(pieceId);
        }
      }
    }

    if (needsRetry.length > 0) {
      const nextRetries = { ...state.retries };
      for (const pieceId of needsRetry) {
        const key = retryKey("build", pieceId, 1);
        nextRetries[key] = (nextRetries[key] ?? 0) + 1;
      }
      const subagents: GoSubagentTask[] = needsRetry.map((pieceId) => ({
        role: "builder",
        piece: pieceId,
        attempt: 1,
        brief: builderBrief(paths, pieceId, 1),
      }));
      return {
        state: {
          ...state,
          retries: nextRetries,
        },
        action: {
          action: "spawn",
          parallel: subagents.length > 1,
          subagents,
        },
      };
    }

    const updatedState: GoState = {
      ...state,
      failedPieces: mergeUnique(state.failedPieces, newlyFailed),
    };
    return advanceCritiqueQueue(
      updatedState,
      spec,
      builtForCritique,
      [],
      spec.builtPieces,
      undefined,
    );
  }

  if (phase.kind === "critiquing") {
    const parsed = parseCriticReport(reportsOnDisk, phase.piece, 1);
    if (!parsed.ok) {
      const key = retryKey("critic", phase.piece, 1);
      const count = state.retries[key] ?? 0;
      if (count < 1) {
        const nextState: GoState = {
          ...state,
          retries: { ...state.retries, [key]: count + 1 },
        };
        return {
          state: nextState,
          action: {
            action: "spawn",
            parallel: false,
            subagents: [
              {
                role: "critic",
                piece: phase.piece,
                attempt: 1,
                brief: criticBrief(paths, phase.piece, 1),
              },
            ],
          },
        };
      }

      const nextRetryQueue = addUnique(phase.retryQueue, phase.piece);
      return advanceCritiqueQueue(
        state,
        spec,
        phase.queue,
        nextRetryQueue,
        spec.builtPieces,
        undefined,
      );
    }

    if (parsed.report.verdict === "PASS") {
      const nextBuiltPieces = addUnique(spec.builtPieces, phase.piece);
      return advanceCritiqueQueue(
        state,
        spec,
        phase.queue,
        phase.retryQueue,
        nextBuiltPieces,
        nextBuiltPieces,
      );
    }

    const nextRetryQueue = addUnique(phase.retryQueue, phase.piece);
    return advanceCritiqueQueue(
      state,
      spec,
      phase.queue,
      nextRetryQueue,
      spec.builtPieces,
      undefined,
    );
  }

  if (phase.kind === "retrying_build") {
    const parsed = parseBuildReport(reportsOnDisk, phase.piece, 2);
    if (!parsed.ok) {
      const key = retryKey("build", phase.piece, 2);
      const count = state.retries[key] ?? 0;
      if (count < 1) {
        const nextState: GoState = {
          ...state,
          retries: { ...state.retries, [key]: count + 1 },
        };
        return {
          state: nextState,
          action: {
            action: "spawn",
            parallel: false,
            subagents: [
              {
                role: "builder",
                piece: phase.piece,
                attempt: 2,
                brief: builderBrief(paths, phase.piece, 2),
              },
            ],
          },
        };
      }

      const failedState: GoState = {
        ...state,
        failedPieces: addUnique(state.failedPieces, phase.piece),
      };
      return startNextRetryOrRound(failedState, spec, phase.queue, spec.builtPieces, undefined);
    }

    if (parsed.report.result === "BUILT") {
      const nextState: GoState = {
        ...state,
        phase: { kind: "retrying_critic", piece: phase.piece, queue: phase.queue },
      };
      return {
        state: nextState,
        action: {
          action: "spawn",
          parallel: false,
          subagents: [
            {
              role: "critic",
              piece: phase.piece,
              attempt: 2,
              brief: criticBrief(paths, phase.piece, 2),
            },
          ],
        },
      };
    }

    const failedState: GoState = {
      ...state,
      failedPieces: addUnique(state.failedPieces, phase.piece),
    };
    return startNextRetryOrRound(failedState, spec, phase.queue, spec.builtPieces, undefined);
  }

  if (phase.kind === "retrying_critic") {
    const parsed = parseCriticReport(reportsOnDisk, phase.piece, 2);
    if (!parsed.ok) {
      const key = retryKey("critic", phase.piece, 2);
      const count = state.retries[key] ?? 0;
      if (count < 1) {
        const nextState: GoState = {
          ...state,
          retries: { ...state.retries, [key]: count + 1 },
        };
        return {
          state: nextState,
          action: {
            action: "spawn",
            parallel: false,
            subagents: [
              {
                role: "critic",
                piece: phase.piece,
                attempt: 2,
                brief: criticBrief(paths, phase.piece, 2),
              },
            ],
          },
        };
      }

      const failedState: GoState = {
        ...state,
        failedPieces: addUnique(state.failedPieces, phase.piece),
      };
      return startNextRetryOrRound(failedState, spec, phase.queue, spec.builtPieces, undefined);
    }

    if (parsed.report.verdict === "PASS") {
      const nextBuiltPieces = addUnique(spec.builtPieces, phase.piece);
      return startNextRetryOrRound(state, spec, phase.queue, nextBuiltPieces, nextBuiltPieces);
    }

    const failedState: GoState = {
      ...state,
      failedPieces: addUnique(state.failedPieces, phase.piece),
    };
    return startNextRetryOrRound(failedState, spec, phase.queue, spec.builtPieces, undefined);
  }

  // phase.kind === "auditing"
  const parsed = parseAuditReport(reportsOnDisk, spec);
  if (!parsed.ok) {
    const count = state.retries[AUDIT_RETRY_KEY] ?? 0;
    if (count < 1) {
      const nextState: GoState = {
        ...state,
        retries: { ...state.retries, [AUDIT_RETRY_KEY]: count + 1 },
      };
      return {
        state: nextState,
        action: {
          action: "spawn",
          parallel: false,
          subagents: [
            {
              role: "auditor",
              piece: "all",
              brief: auditorBrief(paths),
            },
          ],
        },
      };
    }

    const reason = `Auditor report missing or invalid after retry in ${state.runDir}`;
    const nextState: GoState = {
      ...state,
      phase: { kind: "stopped", reason, details: parsed.issues },
    };
    return {
      state: nextState,
      action: {
        action: "stop",
        reason,
        details: parsed.issues,
      },
    };
  }

  const reportPath = path.join(state.runDir, RENDERED_REPORT_FILE_NAME);
  const renderedReportMd = renderGoAudit(parsed.report);
  const nextState: GoState = {
    ...state,
    phase: { kind: "done", reportPath },
  };
  return {
    state: nextState,
    action: {
      action: "relay",
      report: reportPath,
    },
    specBuiltPieces: [...parsed.report.builtPieces],
    renderedReportMd,
  };
};
