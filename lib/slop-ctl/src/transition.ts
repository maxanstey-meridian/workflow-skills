import path from "node:path";
import type { z } from "zod";
import type { ValidationIssue } from "../../contracts/src/spec-schema.ts";
import {
  AREAS_FILE_NAME,
  AUDIT_REPORT_FILE_NAME,
  type BriefPaths,
  DESIGN_REPORT_FILE_NAME,
  designReaderBrief,
  hunterBrief,
  hunterReportFileName,
  RENDERED_REPORT_FILE_NAME,
  reporterBrief,
  SCOPE_FILE_NAME,
  SIZES_FILE_NAME,
  verifierBrief,
  verifyReportFileName,
} from "./briefs.ts";
import { renderSlopAudit } from "./render.ts";
import {
  type Area,
  type AreasFile,
  AreasInputSchema,
  type DesignReport,
  DesignReportSchema,
  type HunterReport,
  HunterReportSchema,
  type SizedFile,
  type SlopAction,
  type SlopAudit,
  SlopAuditSchema,
  type SlopState,
  type SlopSubagentTask,
  type VerifyReport,
  VerifyReportSchema,
} from "./schemas.ts";
import {
  validateAreasAgainstScope,
  validateDesignReport,
  validateHunterReport,
  validateSlopAudit,
  validateVerifyAgainstReport,
} from "./validate.ts";

export const OVERSIZED_LINE_LIMIT = 2000;
export const TOP_BIGGEST_LIMIT = 15;
export const SINGLE_AREA_LINE_LIMIT = 8000;
export const MAX_CONCURRENCY = 8;
export const MAX_ATTEMPTS = 2;

const REST_SUFFIX = "-rest";
const DESIGN_RETRY_KEY = "design-reader";
const REPORTER_RETRY_KEY = "reporter";

export type RawYamlEntry =
  | { exists: false }
  | { exists: true; parseError: string }
  | { exists: true; raw: unknown };

export type SlopSnapshot = {
  scopeFiles: ReadonlyArray<string>;
  sizesByFile: ReadonlyMap<string, number>;
  areasYaml: RawYamlEntry;
  reports: ReadonlyMap<string, RawYamlEntry>;
};

export type SlopEffects = {
  writeAreas?: AreasFile;
  renderReport?: {
    reportPath: string;
    markdown: string;
  };
};

export type SlopTransitionResult = {
  nextState: SlopState;
  action: SlopAction;
  effects: SlopEffects;
};

type ParsedReport<T> = { ok: true; report: T } | { ok: false; issues: string[] };

const hunterRetryKey = (areaName: string): string => `hunter:${areaName}`;
const verifierRetryKey = (reportKey: string): string => `verifier:${reportKey}`;

const pathsFromState = (state: SlopState): BriefPaths => ({
  skillDir: state.skillDir,
  runDir: state.runDir,
});

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

const parseReport = <T>(
  reports: ReadonlyMap<string, RawYamlEntry>,
  fileName: string,
  schema: z.ZodType<T>,
  extraValidate?: (report: T) => ValidationIssue[],
): ParsedReport<T> => {
  const entry = reports.get(fileName);
  if (entry === undefined || !entry.exists) {
    return { ok: false, issues: [`${fileName}: file not found`] };
  }
  if ("parseError" in entry) {
    return { ok: false, issues: [entry.parseError] };
  }
  const parsed = schema.safeParse(entry.raw);
  if (!parsed.success) {
    return { ok: false, issues: formatZodIssues(parsed.error) };
  }
  if (extraValidate !== undefined) {
    const issues = formatValidationIssues(extraValidate(parsed.data));
    if (issues.length > 0) {
      return { ok: false, issues };
    }
  }
  return { ok: true, report: parsed.data };
};

const areasNeedEnrichment = (
  input: { root?: string; head?: string; areas: ReadonlyArray<{ lines?: number }> },
  enriched: AreasFile,
): boolean => {
  if (input.root !== enriched.root || input.head !== enriched.head) {
    return true;
  }
  for (let i = 0; i < enriched.areas.length; i += 1) {
    if (input.areas[i]?.lines !== enriched.areas[i]?.lines) {
      return true;
    }
  }
  return false;
};

const computeRestArea = (
  baseArea: Area,
  notReadInFull: ReadonlyArray<string>,
  sizesByFile: ReadonlyMap<string, number>,
): Area | undefined => {
  const baseFiles = new Set(baseArea.files);
  const restFiles: string[] = [];
  const seen = new Set<string>();
  let totalLines = 0;

  for (const filePath of notReadInFull) {
    if (!baseFiles.has(filePath) || seen.has(filePath)) {
      continue;
    }
    seen.add(filePath);
    restFiles.push(filePath);
    totalLines += sizesByFile.get(filePath) ?? 0;
  }

  if (restFiles.length === 0) {
    return undefined;
  }

  return {
    name: `${baseArea.name}${REST_SUFFIX}`,
    lines: totalLines,
    files: restFiles,
  };
};

export const advanceSlop = (state: SlopState, snapshot: SlopSnapshot): SlopTransitionResult => {
  const paths = pathsFromState(state);

  if (state.phase === "done") {
    return {
      nextState: state,
      action: {
        action: "relay",
        report: path.join(state.runDir, RENDERED_REPORT_FILE_NAME),
      },
      effects: {},
    };
  }

  if (snapshot.scopeFiles.length === 0) {
    return {
      nextState: state,
      action: {
        action: "stop",
        reason: "No scannable files remain in scope.",
      },
      effects: {},
    };
  }

  const sizedFiles: SizedFile[] = snapshot.scopeFiles.map((filePath) => ({
    path: filePath,
    lines: snapshot.sizesByFile.get(filePath) ?? 0,
  }));
  const sortedBySize = [...sizedFiles].sort(
    (a, b) => b.lines - a.lines || a.path.localeCompare(b.path),
  );
  const oversized = sortedBySize.filter((file) => file.lines > OVERSIZED_LINE_LIMIT);
  const topBiggest = sortedBySize.slice(0, TOP_BIGGEST_LIMIT);
  const totalLines = sizedFiles.reduce((sum, file) => sum + file.lines, 0);

  if (!state.scopeReviewed && oversized.length > 0) {
    return {
      nextState: {
        ...state,
        phase: "review-scope",
      },
      action: {
        action: "review-scope",
        scopeFile: path.join(state.runDir, SCOPE_FILE_NAME),
        sizesFile: path.join(state.runDir, SIZES_FILE_NAME),
        oversized,
        topBiggest,
      },
      effects: {},
    };
  }

  const effects: SlopEffects = {};
  let workingState: SlopState = state;
  let areasFile: AreasFile;

  const areasPath = path.join(state.runDir, AREAS_FILE_NAME);
  if (!snapshot.areasYaml.exists) {
    if (totalLines <= SINGLE_AREA_LINE_LIMIT) {
      areasFile = {
        root: state.root,
        head: state.head,
        areas: [
          {
            name: "all",
            lines: totalLines,
            files: [...snapshot.scopeFiles],
          },
        ],
      };
      effects.writeAreas = areasFile;
      workingState = {
        ...workingState,
        areasSplit: true,
      };
    } else {
      return {
        nextState: {
          ...workingState,
          phase: "split",
        },
        action: {
          action: "split",
          scopeFile: path.join(state.runDir, SCOPE_FILE_NAME),
          sizesFile: path.join(state.runDir, SIZES_FILE_NAME),
          areasFile: areasPath,
          totalLines,
          errors: [],
        },
        effects: {},
      };
    }
  } else {
    if ("parseError" in snapshot.areasYaml) {
      return {
        nextState: {
          ...workingState,
          phase: "split",
        },
        action: {
          action: "split",
          scopeFile: path.join(state.runDir, SCOPE_FILE_NAME),
          sizesFile: path.join(state.runDir, SIZES_FILE_NAME),
          areasFile: areasPath,
          totalLines,
          errors: [snapshot.areasYaml.parseError],
        },
        effects: {},
      };
    }

    const parsedAreas = AreasInputSchema.safeParse(snapshot.areasYaml.raw);
    if (!parsedAreas.success) {
      return {
        nextState: {
          ...workingState,
          phase: "split",
        },
        action: {
          action: "split",
          scopeFile: path.join(state.runDir, SCOPE_FILE_NAME),
          sizesFile: path.join(state.runDir, SIZES_FILE_NAME),
          areasFile: areasPath,
          totalLines,
          errors: formatZodIssues(parsedAreas.error),
        },
        effects: {},
      };
    }

    const validatedAreas = validateAreasAgainstScope(
      parsedAreas.data.areas,
      snapshot.scopeFiles,
      snapshot.sizesByFile,
    );
    if (validatedAreas.issues.length > 0) {
      return {
        nextState: {
          ...workingState,
          phase: "split",
        },
        action: {
          action: "split",
          scopeFile: path.join(state.runDir, SCOPE_FILE_NAME),
          sizesFile: path.join(state.runDir, SIZES_FILE_NAME),
          areasFile: areasPath,
          totalLines,
          errors: formatValidationIssues(validatedAreas.issues),
        },
        effects: {},
      };
    }

    areasFile = {
      root: state.root,
      head: state.head,
      areas: validatedAreas.areas,
    };
    if (!workingState.areasSplit || areasNeedEnrichment(parsedAreas.data, areasFile)) {
      effects.writeAreas = areasFile;
    }
    workingState = {
      ...workingState,
      areasSplit: true,
    };
  }

  const baseAreas = areasFile.areas.filter((area) => !area.name.endsWith(REST_SUFFIX));
  const needsDesignReader = baseAreas.length > 1;
  let validDesignReport: DesignReport | undefined;

  if (needsDesignReader) {
    const parsedDesign = parseReport<DesignReport>(
      snapshot.reports,
      DESIGN_REPORT_FILE_NAME,
      DesignReportSchema,
      validateDesignReport,
    );
    if (parsedDesign.ok) {
      validDesignReport = parsedDesign.report;
    } else {
      const attempts = workingState.retries[DESIGN_RETRY_KEY] ?? 0;
      if (attempts < MAX_ATTEMPTS) {
        return {
          nextState: {
            ...workingState,
            phase: "design",
            retries: {
              ...workingState.retries,
              [DESIGN_RETRY_KEY]: attempts + 1,
            },
          },
          action: {
            action: "spawn",
            parallel: false,
            maxConcurrency: 1,
            subagents: [
              {
                role: "design-reader",
                yours: "design",
                report: path.join(state.runDir, DESIGN_REPORT_FILE_NAME),
                brief: designReaderBrief(paths),
              },
            ],
          },
          effects,
        };
      }
    }
  }

  const validHunterReports = new Map<string, HunterReport>();
  const existingAreaNames = new Set(areasFile.areas.map((area) => area.name));
  const addedRestAreas: Area[] = [];

  for (const area of areasFile.areas) {
    const singleArea = !needsDesignReader && !area.name.endsWith(REST_SUFFIX);
    const parsedHunter = parseReport<HunterReport>(
      snapshot.reports,
      hunterReportFileName(area.name),
      HunterReportSchema,
      (report) => validateHunterReport(report, { singleArea }),
    );
    if (!parsedHunter.ok) {
      continue;
    }
    validHunterReports.set(area.name, parsedHunter.report);

    if (area.name.endsWith(REST_SUFFIX)) {
      continue;
    }
    const restName = `${area.name}${REST_SUFFIX}`;
    if (existingAreaNames.has(restName)) {
      continue;
    }
    const restArea = computeRestArea(area, parsedHunter.report.notReadInFull, snapshot.sizesByFile);
    if (restArea !== undefined) {
      existingAreaNames.add(restArea.name);
      addedRestAreas.push(restArea);
    }
  }

  if (addedRestAreas.length > 0) {
    areasFile = {
      ...areasFile,
      areas: [...areasFile.areas, ...addedRestAreas],
    };
    effects.writeAreas = areasFile;
  }

  const pendingHunters: Area[] = [];
  for (const area of areasFile.areas) {
    if (validHunterReports.has(area.name)) {
      continue;
    }
    const attempts = workingState.retries[hunterRetryKey(area.name)] ?? 0;
    if (attempts < MAX_ATTEMPTS) {
      pendingHunters.push(area);
    }
  }

  if (pendingHunters.length > 0) {
    const batch = pendingHunters.slice(0, MAX_CONCURRENCY);
    const nextRetries = { ...workingState.retries };
    const subagents: SlopSubagentTask[] = batch.map((area) => {
      const key = hunterRetryKey(area.name);
      nextRetries[key] = (nextRetries[key] ?? 0) + 1;
      return {
        role: "hunter",
        yours: area.name,
        report: path.join(state.runDir, hunterReportFileName(area.name)),
        brief: hunterBrief(paths, area.name),
      };
    });
    return {
      nextState: {
        ...workingState,
        phase: "hunt",
        retries: nextRetries,
      },
      action: {
        action: "spawn",
        parallel: true,
        maxConcurrency: MAX_CONCURRENCY,
        subagents,
      },
      effects,
    };
  }

  const verifyTargets: Array<{
    key: string;
    reportFileName: string;
    report: DesignReport | HunterReport;
  }> = [];
  if (validDesignReport !== undefined) {
    verifyTargets.push({
      key: "design",
      reportFileName: DESIGN_REPORT_FILE_NAME,
      report: validDesignReport,
    });
  }
  for (const area of areasFile.areas) {
    const report = validHunterReports.get(area.name);
    if (report !== undefined) {
      verifyTargets.push({
        key: area.name,
        reportFileName: hunterReportFileName(area.name),
        report,
      });
    }
  }

  const pendingVerifiers: Array<{ key: string; reportFileName: string }> = [];
  for (const target of verifyTargets) {
    const parsedVerify = parseReport<VerifyReport>(
      snapshot.reports,
      verifyReportFileName(target.key),
      VerifyReportSchema,
      (verifyReport) => validateVerifyAgainstReport(verifyReport, target.report),
    );
    if (parsedVerify.ok) {
      continue;
    }
    const attempts = workingState.retries[verifierRetryKey(target.key)] ?? 0;
    if (attempts < MAX_ATTEMPTS) {
      pendingVerifiers.push({
        key: target.key,
        reportFileName: target.reportFileName,
      });
    }
  }

  if (pendingVerifiers.length > 0) {
    const batch = pendingVerifiers.slice(0, MAX_CONCURRENCY);
    const nextRetries = { ...workingState.retries };
    const subagents: SlopSubagentTask[] = batch.map((target) => {
      const key = verifierRetryKey(target.key);
      nextRetries[key] = (nextRetries[key] ?? 0) + 1;
      return {
        role: "verifier",
        yours: target.reportFileName,
        report: path.join(state.runDir, verifyReportFileName(target.key)),
        brief: verifierBrief(paths, target.key),
      };
    });
    return {
      nextState: {
        ...workingState,
        phase: "verify",
        retries: nextRetries,
      },
      action: {
        action: "spawn",
        parallel: true,
        maxConcurrency: MAX_CONCURRENCY,
        subagents,
      },
      effects,
    };
  }

  const parsedAudit = parseReport<SlopAudit>(
    snapshot.reports,
    AUDIT_REPORT_FILE_NAME,
    SlopAuditSchema,
    validateSlopAudit,
  );
  if (!parsedAudit.ok) {
    const attempts = workingState.retries[REPORTER_RETRY_KEY] ?? 0;
    if (attempts < MAX_ATTEMPTS) {
      return {
        nextState: {
          ...workingState,
          phase: "report",
          retries: {
            ...workingState.retries,
            [REPORTER_RETRY_KEY]: attempts + 1,
          },
        },
        action: {
          action: "spawn",
          parallel: false,
          maxConcurrency: 1,
          subagents: [
            {
              role: "reporter",
              yours: "all",
              report: path.join(state.runDir, AUDIT_REPORT_FILE_NAME),
              brief: reporterBrief(paths),
            },
          ],
        },
        effects,
      };
    }

    return {
      nextState: {
        ...workingState,
        phase: "report",
      },
      action: {
        action: "stop",
        reason: `Reporter report missing or invalid after retry in ${state.runDir}`,
        details: parsedAudit.issues,
      },
      effects,
    };
  }

  const reportPath = path.join(state.runDir, RENDERED_REPORT_FILE_NAME);
  return {
    nextState: {
      ...workingState,
      phase: "done",
    },
    action: {
      action: "relay",
      report: reportPath,
    },
    effects: {
      ...effects,
      renderReport: {
        reportPath,
        markdown: renderSlopAudit(parsedAudit.report),
      },
    },
  };
};
