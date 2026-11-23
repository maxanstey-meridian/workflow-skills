import type {
  ColdReadReport,
  CycleAuditReport,
  CycleCriticReport,
  GoAuditReport,
  GoCriticReport,
  ReviewReport,
} from "./report-schemas.ts";
import type { Spec, ValidationIssue } from "./spec-schema.ts";

export type CycleAuditReviewFindingRef = {
  report: string;
  id: string;
  do: string;
};

export type CycleAuditContext = {
  spec?: Spec;
  reviewFindings: ReadonlyArray<CycleAuditReviewFindingRef>;
};

const FAILING_CYCLE_CRITIC_VERDICTS = new Set([
  "STILL_THERE",
  "NOT_A_HARM",
  "EXTRA",
  "WRONG",
  "MISSING",
]);

export const countReviewFixes = (report: ReviewReport): number =>
  report.findings.filter((finding) => finding.do === "fix").length;

export const validateColdRead = (report: ColdReadReport, spec: Spec): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const specDecisionIds = new Set(spec.decisions.map((decision) => decision.id));
  const seenDecisionIds = new Set<string>();

  for (let i = 0; i < report.laws.length; i += 1) {
    const law = report.laws[i];
    if (law === undefined) {
      continue;
    }
    if (!specDecisionIds.has(law.decisionId)) {
      issues.push({
        path: `laws[${i}].decisionId`,
        message: `unknown decision ID "${law.decisionId}" not present in spec`,
      });
    } else if (seenDecisionIds.has(law.decisionId)) {
      issues.push({
        path: `laws[${i}].decisionId`,
        message: `duplicate law check for decision ID "${law.decisionId}"`,
      });
    } else {
      seenDecisionIds.add(law.decisionId);
    }

    if (
      law.status === "broken" &&
      (law.findingIndex < 1 || law.findingIndex > report.findings.length)
    ) {
      issues.push({
        path: `laws[${i}].findingIndex`,
        message: `findingIndex ${law.findingIndex} is out of range 1..${report.findings.length}`,
      });
    }
  }

  for (const decision of spec.decisions) {
    if (!seenDecisionIds.has(decision.id)) {
      issues.push({
        path: "laws",
        message: `missing law check for spec decision "${decision.id}"`,
      });
    }
  }

  return issues;
};

export const validateGoCritic = (report: GoCriticReport): ValidationIssue[] => {
  if (report.verdict !== "PASS") {
    return [];
  }

  const issues: ValidationIssue[] = [];
  const findingLists: ReadonlyArray<{
    field: "missing" | "extra" | "misunderstood" | "shrunkCheck" | "unproven";
    items: ReadonlyArray<string>;
  }> = [
    { field: "missing", items: report.missing },
    { field: "extra", items: report.extra },
    { field: "misunderstood", items: report.misunderstood },
    { field: "shrunkCheck", items: report.shrunkCheck },
    { field: "unproven", items: report.unproven },
  ];

  for (const { field, items } of findingLists) {
    if (items.length > 0) {
      issues.push({
        path: field,
        message: `verdict cannot be "PASS" when ${field} is non-empty`,
      });
    }
  }

  for (let i = 0; i < report.ran.length; i += 1) {
    const run = report.ran[i];
    if (run !== undefined && run.exit !== 0) {
      issues.push({
        path: `ran[${i}].exit`,
        message: `verdict cannot be "PASS" when command "${run.cmd}" exited ${run.exit}`,
      });
    }
  }

  return issues;
};

export const validateCycleCritic = (report: CycleCriticReport): ValidationIssue[] => {
  if (report.verdict !== "PASS") {
    return [];
  }

  const issues: ValidationIssue[] = [];

  for (let i = 0; i < report.ran.length; i += 1) {
    const run = report.ran[i];
    if (run !== undefined && run.exit !== 0) {
      issues.push({
        path: `ran[${i}].exit`,
        message: `verdict cannot be "PASS" when command "${run.cmd}" exited ${run.exit}`,
      });
    }
  }

  for (let i = 0; i < report.findings.length; i += 1) {
    const finding = report.findings[i];
    if (finding !== undefined && FAILING_CYCLE_CRITIC_VERDICTS.has(finding.verdict)) {
      issues.push({
        path: `findings[${i}].verdict`,
        message: `verdict cannot be "PASS" when finding "${finding.findingId}" has verdict "${finding.verdict}"`,
      });
    }
  }

  if (report.missing.length > 0) {
    issues.push({
      path: "missing",
      message: 'verdict cannot be "PASS" when missing is non-empty',
    });
  }

  if (report.extra.length > 0) {
    issues.push({
      path: "extra",
      message: 'verdict cannot be "PASS" when extra is non-empty',
    });
  }

  if (report.specBroken.length > 0) {
    issues.push({
      path: "specBroken",
      message: 'verdict cannot be "PASS" when specBroken is non-empty',
    });
  }

  return issues;
};

const validateSpecAuditCompleteness = (
  report: Pick<GoAuditReport, "pieces" | "decisions" | "checked" | "notChecked" | "builtPieces">,
  spec: Spec,
  issues: ValidationIssue[],
): void => {
  const specPieceIds = new Set(spec.pieces.map((piece) => piece.id));
  const seenPieceIds = new Set<string>();
  const donePieceIds = new Set<string>();

  for (let i = 0; i < report.pieces.length; i += 1) {
    const piece = report.pieces[i];
    if (piece === undefined) {
      continue;
    }
    if (!specPieceIds.has(piece.id)) {
      issues.push({
        path: `pieces[${i}].id`,
        message: `unknown piece ID "${piece.id}" not present in spec`,
      });
    } else if (seenPieceIds.has(piece.id)) {
      issues.push({
        path: `pieces[${i}].id`,
        message: `duplicate piece ID "${piece.id}"`,
      });
    } else {
      seenPieceIds.add(piece.id);
    }
    if (piece.status === "done") {
      donePieceIds.add(piece.id);
    }
  }

  for (const piece of spec.pieces) {
    if (!seenPieceIds.has(piece.id)) {
      issues.push({
        path: "pieces",
        message: `missing spec piece "${piece.id}"`,
      });
    }
  }

  const specDecisionIds = new Set(spec.decisions.map((decision) => decision.id));
  const seenDecisionIds = new Set<string>();

  for (let i = 0; i < report.decisions.length; i += 1) {
    const decision = report.decisions[i];
    if (decision === undefined) {
      continue;
    }
    if (!specDecisionIds.has(decision.id)) {
      issues.push({
        path: `decisions[${i}].id`,
        message: `unknown decision ID "${decision.id}" not present in spec`,
      });
    } else if (seenDecisionIds.has(decision.id)) {
      issues.push({
        path: `decisions[${i}].id`,
        message: `duplicate decision ID "${decision.id}"`,
      });
    } else {
      seenDecisionIds.add(decision.id);
    }
  }

  for (const decision of spec.decisions) {
    if (!seenDecisionIds.has(decision.id)) {
      issues.push({
        path: "decisions",
        message: `missing spec decision "${decision.id}"`,
      });
    }
  }

  const checkedCmds = new Set(report.checked.map((run) => run.cmd));
  const notCheckedChecks = new Set(report.notChecked.map((entry) => entry.check));

  for (const doneMean of spec.doneMeans) {
    if (!checkedCmds.has(doneMean.cmd) && !notCheckedChecks.has(doneMean.cmd)) {
      issues.push({
        path: "checked",
        message: `missing spec doneMeans command "${doneMean.cmd}" in checked or notChecked`,
      });
    }
  }

  const seenBuiltPieces = new Set<string>();
  for (let i = 0; i < report.builtPieces.length; i += 1) {
    const pieceId = report.builtPieces[i];
    if (pieceId === undefined) {
      continue;
    }
    if (seenBuiltPieces.has(pieceId)) {
      issues.push({
        path: `builtPieces[${i}]`,
        message: `duplicate piece ID "${pieceId}" in builtPieces`,
      });
      continue;
    }
    seenBuiltPieces.add(pieceId);
    if (!donePieceIds.has(pieceId)) {
      issues.push({
        path: `builtPieces[${i}]`,
        message: `builtPieces includes "${pieceId}" which is not marked "done"`,
      });
    }
  }

  for (const doneId of donePieceIds) {
    if (!seenBuiltPieces.has(doneId)) {
      issues.push({
        path: "builtPieces",
        message: `builtPieces is missing piece "${doneId}" marked "done"`,
      });
    }
  }

  for (let i = 0; i < report.checked.length; i += 1) {
    const run = report.checked[i];
    if (run === undefined || run.exit === 0 || run.pieces === undefined) {
      continue;
    }
    for (const pieceId of run.pieces) {
      if (donePieceIds.has(pieceId)) {
        issues.push({
          path: `checked[${i}]`,
          message: `piece "${pieceId}" is marked "done" while covering command "${run.cmd}" exited ${run.exit}`,
        });
      }
    }
  }
};

export const validateGoAudit = (report: GoAuditReport, spec: Spec): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  validateSpecAuditCompleteness(report, spec, issues);
  return issues;
};

const findingKey = (reportName: string, findingId: string): string => `${reportName}\0${findingId}`;

export const validateCycleAudit = (
  report: CycleAuditReport,
  context: CycleAuditContext,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (context.spec === undefined) {
    if (report.specStatus.status !== "none") {
      issues.push({
        path: "specStatus.status",
        message: `specStatus must be "none" when no spec is provided (got "${report.specStatus.status}")`,
      });
    }
  } else {
    if (report.specStatus.status === "none") {
      issues.push({
        path: "specStatus.status",
        message: 'specStatus cannot be "none" when a spec is provided',
      });
    }

    validateSpecAuditCompleteness(report, context.spec, issues);

    if (report.specStatus.status === "built") {
      for (let i = 0; i < report.pieces.length; i += 1) {
        const piece = report.pieces[i];
        if (piece !== undefined && piece.status !== "done") {
          issues.push({
            path: `pieces[${i}].status`,
            message: `specStatus cannot be "built" while piece "${piece.id}" has status "${piece.status}"`,
          });
        }
      }

      for (let i = 0; i < report.decisions.length; i += 1) {
        const decision = report.decisions[i];
        if (decision !== undefined && decision.status === "not-built") {
          issues.push({
            path: `decisions[${i}].status`,
            message: `specStatus cannot be "built" while decision "${decision.id}" has status "not-built"`,
          });
        }
      }

      for (const doneMean of context.spec.doneMeans) {
        const matchingRuns = report.checked.filter((run) => run.cmd === doneMean.cmd);
        if (matchingRuns.length === 0) {
          issues.push({
            path: "checked",
            message: `specStatus cannot be "built" while spec doneMeans command "${doneMean.cmd}" is not in checked`,
          });
        } else if (matchingRuns.some((run) => run.exit !== 0)) {
          issues.push({
            path: "checked",
            message: `specStatus cannot be "built" while spec doneMeans command "${doneMean.cmd}" exited non-zero`,
          });
        }
      }

      if (report.notFixed.length > 0) {
        issues.push({
          path: "notFixed",
          message: 'specStatus cannot be "built" while notFixed is non-empty',
        });
      }
    }
  }

  const accountedFindings = new Set<string>();
  const findingSections: ReadonlyArray<{
    section: "fixed" | "notAHarm" | "notFixed";
    entries: ReadonlyArray<{ findingId: string; report: string }>;
  }> = [
    { section: "fixed", entries: report.fixed },
    { section: "notAHarm", entries: report.notAHarm },
    { section: "notFixed", entries: report.notFixed },
  ];

  for (const { section, entries } of findingSections) {
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry === undefined) {
        continue;
      }
      const key = findingKey(entry.report, entry.findingId);
      if (accountedFindings.has(key)) {
        issues.push({
          path: `${section}[${i}]`,
          message: `finding "${entry.findingId}" from "${entry.report}" appears more than once across fixed, notAHarm, and notFixed`,
        });
      } else {
        accountedFindings.add(key);
      }
    }
  }

  for (const finding of context.reviewFindings) {
    if (finding.do !== "fix") {
      continue;
    }
    const key = findingKey(finding.report, finding.id);
    if (!accountedFindings.has(key)) {
      issues.push({
        path: "fixed",
        message: `review finding "${finding.id}" from "${finding.report}" with do "fix" is missing from fixed, notAHarm, and notFixed`,
      });
    }
  }

  return issues;
};
