import path from "node:path";
import type { SlopRole } from "./schemas.ts";

export type BriefPaths = {
  skillDir: string;
  runDir: string;
};

export const SCOPE_FILE_NAME = "scope.txt";
export const SIZES_FILE_NAME = "sizes.txt";
export const AREAS_FILE_NAME = "areas.yaml";
export const DESIGN_REPORT_FILE_NAME = "report-design.yaml";
export const AUDIT_REPORT_FILE_NAME = "audit.yaml";
export const RENDERED_REPORT_FILE_NAME = "report.md";

export const hunterReportFileName = (areaName: string): string => `report-${areaName}.yaml`;

export const verifyReportFileName = (reportKey: string): string => `verify-${reportKey}.yaml`;

export const formatSlopBrief = (
  paths: BriefPaths,
  role: SlopRole,
  yours: string,
  reportPath: string,
): string =>
  [
    `Read ${path.join(paths.skillDir, "references", `${role}.md`)} in full, then do what it says.`,
    `Hunt folder: ${paths.runDir}`,
    `Yours: ${yours}`,
    `Report: ${reportPath}`,
  ].join("\n");

export const designReaderBrief = (paths: BriefPaths): string =>
  formatSlopBrief(
    paths,
    "design-reader",
    "design",
    path.join(paths.runDir, DESIGN_REPORT_FILE_NAME),
  );

export const hunterBrief = (paths: BriefPaths, areaName: string): string =>
  formatSlopBrief(
    paths,
    "hunter",
    areaName,
    path.join(paths.runDir, hunterReportFileName(areaName)),
  );

export const verifierBrief = (paths: BriefPaths, reportKey: string): string => {
  const reportFileName =
    reportKey === "design" ? DESIGN_REPORT_FILE_NAME : hunterReportFileName(reportKey);
  return formatSlopBrief(
    paths,
    "verifier",
    reportFileName,
    path.join(paths.runDir, verifyReportFileName(reportKey)),
  );
};

export const reporterBrief = (paths: BriefPaths): string =>
  formatSlopBrief(paths, "reporter", "all", path.join(paths.runDir, AUDIT_REPORT_FILE_NAME));
