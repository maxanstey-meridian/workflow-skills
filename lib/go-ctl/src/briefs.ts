import path from "node:path";

export type BriefPaths = {
  skillDir: string;
  specPath: string;
  runDir: string;
};

export const AUDIT_REPORT_FILE_NAME = "audit.yaml";
export const RENDERED_REPORT_FILE_NAME = "report.md";

export const buildReportFileName = (pieceId: string, attempt: 1 | 2): string =>
  `build-${pieceId}-${attempt}.yaml`;

export const criticReportFileName = (pieceId: string, attempt: 1 | 2): string =>
  `critic-${pieceId}-${attempt}.yaml`;

export const builderBrief = (paths: BriefPaths, pieceId: string, attempt: 1 | 2): string =>
  [
    `Read ${path.join(paths.skillDir, "references", "builder.md")} in full, then do what it says.`,
    `Spec: ${paths.specPath}`,
    `Piece: ${pieceId} · attempt ${attempt}`,
    `Report: ${path.join(paths.runDir, buildReportFileName(pieceId, attempt))}`,
  ].join("\n");

export const criticBrief = (paths: BriefPaths, pieceId: string, attempt: 1 | 2): string =>
  [
    `Read ${path.join(paths.skillDir, "references", "critic.md")} in full, then do what it says.`,
    `Spec: ${paths.specPath}`,
    `Piece: ${pieceId} · attempt ${attempt}`,
    `Report: ${path.join(paths.runDir, criticReportFileName(pieceId, attempt))}`,
  ].join("\n");

export const auditorBrief = (paths: BriefPaths): string =>
  [
    `Read ${path.join(paths.skillDir, "references", "auditor.md")} in full, then do what it says.`,
    `Spec: ${paths.specPath}`,
    "Piece: all",
    `Report: ${path.join(paths.runDir, AUDIT_REPORT_FILE_NAME)}`,
  ].join("\n");
