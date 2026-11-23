import path from "node:path";
import type { CycleMode, CycleRound, CycleState, ReviewRole } from "./state.ts";

type BriefFields = {
  skillDir: string;
  roleRef: string;
  specPath: string | null;
  files: string;
  mode: CycleMode | "fixes" | "none";
  findings: ReadonlyArray<string>;
  report: string;
};

const formatBrief = (fields: BriefFields): string => {
  const refPath = path.join(fields.skillDir, "references", `${fields.roleRef}.md`);
  const specLine = fields.specPath ?? "none";
  const findingsLine = fields.findings.length > 0 ? fields.findings.join(" ") : "none";

  return [
    `Read ${refPath} in full, then do what it says.`,
    `Spec: ${specLine}`,
    `Files: ${fields.files}`,
    `Mode: ${fields.mode}`,
    `Findings: ${findingsLine}`,
    `Report: ${fields.report}`,
  ].join("\n");
};

const toAbsoluteRunPaths = (runDir: string, filenames: ReadonlyArray<string>): string[] =>
  filenames.map((name) => path.join(runDir, name));

export const buildReviewBrief = (
  state: Pick<CycleState, "skillDir" | "specPath" | "runDir" | "mode">,
  role: ReviewRole,
  listFile: string,
  reportFile: string,
): string =>
  formatBrief({
    skillDir: state.skillDir,
    roleRef: role,
    specPath: state.specPath,
    files: path.join(state.runDir, listFile),
    mode: state.mode,
    findings: [],
    report: path.join(state.runDir, reportFile),
  });

export const buildFixerBrief = (
  state: Pick<CycleState, "skillDir" | "specPath" | "runDir">,
  round: CycleRound,
  sliceId: number,
  reviewReports: ReadonlyArray<string>,
): string =>
  formatBrief({
    skillDir: state.skillDir,
    roleRef: "fixer",
    specPath: state.specPath,
    files: path.join(state.runDir, `slice-${sliceId}.txt`),
    mode: "none",
    findings: toAbsoluteRunPaths(state.runDir, reviewReports),
    report: path.join(state.runDir, `fix-${round}-slice-${sliceId}.yaml`),
  });

export const buildCriticBrief = (
  state: Pick<CycleState, "skillDir" | "specPath" | "runDir">,
  round: CycleRound,
  sliceId: number,
  reviewReports: ReadonlyArray<string>,
  includeFixReport: boolean,
): string => {
  const findings = [...reviewReports];
  if (includeFixReport) {
    findings.push(`fix-${round}-slice-${sliceId}.yaml`);
  }
  return formatBrief({
    skillDir: state.skillDir,
    roleRef: "critic",
    specPath: state.specPath,
    files: path.join(state.runDir, `slice-${sliceId}.txt`),
    mode: "none",
    findings: toAbsoluteRunPaths(state.runDir, findings),
    report: path.join(state.runDir, `critic-${round}-slice-${sliceId}.yaml`),
  });
};

export const buildSecondFixerBrief = (
  state: Pick<CycleState, "skillDir" | "specPath" | "runDir">,
  round: CycleRound,
  sliceId: number,
  reviewReports: ReadonlyArray<string>,
  includeCriticReport: boolean,
): string => {
  const findings = [...reviewReports];
  if (includeCriticReport) {
    findings.push(`critic-${round}-slice-${sliceId}.yaml`);
  }
  return formatBrief({
    skillDir: state.skillDir,
    roleRef: "fixer",
    specPath: state.specPath,
    files: path.join(state.runDir, `slice-${sliceId}.txt`),
    mode: "none",
    findings: toAbsoluteRunPaths(state.runDir, findings),
    report: path.join(state.runDir, `fix-${round}-slice-${sliceId}-b.yaml`),
  });
};

export const buildSecondCriticBrief = (
  state: Pick<CycleState, "skillDir" | "specPath" | "runDir">,
  round: CycleRound,
  sliceId: number,
  reviewReports: ReadonlyArray<string>,
  includeFirstFix: boolean,
  includeSecondFix: boolean,
): string => {
  const findings = [...reviewReports];
  if (includeFirstFix) {
    findings.push(`fix-${round}-slice-${sliceId}.yaml`);
  }
  if (includeSecondFix) {
    findings.push(`fix-${round}-slice-${sliceId}-b.yaml`);
  }
  return formatBrief({
    skillDir: state.skillDir,
    roleRef: "critic",
    specPath: state.specPath,
    files: path.join(state.runDir, `slice-${sliceId}.txt`),
    mode: "none",
    findings: toAbsoluteRunPaths(state.runDir, findings),
    report: path.join(state.runDir, `critic-${round}-slice-${sliceId}-b.yaml`),
  });
};

export const buildRereviewBrief = (
  state: Pick<CycleState, "skillDir" | "specPath" | "runDir">,
  fixedListFile: string,
  reportFile: string,
): string =>
  formatBrief({
    skillDir: state.skillDir,
    roleRef: "reviewer",
    specPath: state.specPath,
    files: path.join(state.runDir, fixedListFile),
    mode: "fixes",
    findings: [],
    report: path.join(state.runDir, reportFile),
  });

export const buildGateFixerBrief = (
  state: Pick<CycleState, "skillDir" | "specPath" | "runDir">,
): string =>
  formatBrief({
    skillDir: state.skillDir,
    roleRef: "fixer",
    specPath: state.specPath,
    files: path.join(state.runDir, "scope.txt"),
    mode: "none",
    findings: [path.join(state.runDir, "gate.log")],
    report: path.join(state.runDir, "fix-gate.yaml"),
  });

export const buildGateCriticBrief = (
  state: Pick<CycleState, "skillDir" | "specPath" | "runDir">,
  includeFixGate: boolean,
): string => {
  const findings = [path.join(state.runDir, "gate.log")];
  if (includeFixGate) {
    findings.push(path.join(state.runDir, "fix-gate.yaml"));
  }
  return formatBrief({
    skillDir: state.skillDir,
    roleRef: "critic",
    specPath: state.specPath,
    files: path.join(state.runDir, "scope.txt"),
    mode: "none",
    findings,
    report: path.join(state.runDir, "critic-gate.yaml"),
  });
};

export const buildAuditorBrief = (
  state: Pick<CycleState, "skillDir" | "specPath" | "runDir">,
): string =>
  formatBrief({
    skillDir: state.skillDir,
    roleRef: "auditor",
    specPath: state.specPath,
    files: state.runDir,
    mode: "none",
    findings: [],
    report: path.join(state.runDir, "audit.yaml"),
  });
