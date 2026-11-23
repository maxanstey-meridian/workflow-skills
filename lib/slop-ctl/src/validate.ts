import type { ValidationIssue } from "../../contracts/src/spec-schema.ts";
import {
  type Area,
  type AreaInput,
  type DesignReport,
  type HunterReport,
  KEBAB_NAME_RE,
  type SlopAudit,
  type VerifyReport,
} from "./schemas.ts";

export type ValidatedAreasResult = {
  issues: ValidationIssue[];
  areas: Area[];
};

const REST_SUFFIX = "-rest";
const WINDOWS_DRIVE_RE = /^[A-Za-z]:[\\/]/;

const isRelativePath = (value: string): boolean => {
  if (value.trim().length === 0) {
    return false;
  }
  if (value.startsWith("/") || value.startsWith("\\") || WINDOWS_DRIVE_RE.test(value)) {
    return false;
  }
  const segments = value.split(/[\\/]/);
  return !segments.includes("..");
};

const validateUniqueFindingIds = (
  findings: ReadonlyArray<{ id: string }>,
  section: string,
  seen: Set<string>,
  issues: ValidationIssue[],
): void => {
  for (let i = 0; i < findings.length; i += 1) {
    const finding = findings[i];
    if (finding === undefined) {
      continue;
    }
    if (seen.has(finding.id)) {
      issues.push({
        path: `${section}[${i}].id`,
        message: `duplicate finding ID "${finding.id}"`,
      });
    } else {
      seen.add(finding.id);
    }
  }
};

export const validateAreasAgainstScope = (
  areas: ReadonlyArray<AreaInput>,
  scopeFiles: ReadonlyArray<string>,
  sizesByFile: ReadonlyMap<string, number>,
): ValidatedAreasResult => {
  const issues: ValidationIssue[] = [];
  const scopeSet = new Set(scopeFiles);
  const seenNames = new Set<string>();
  const baseAreaFiles = new Map<string, Set<string>>();
  const ownerByFile = new Map<string, string>();
  const restAreas: Array<{ index: number; area: AreaInput }> = [];

  if (areas.length === 0) {
    issues.push({
      path: "areas",
      message: "at least one area is required",
    });
  }

  for (let i = 0; i < areas.length; i += 1) {
    const area = areas[i];
    if (area === undefined) {
      continue;
    }

    if (!KEBAB_NAME_RE.test(area.name)) {
      issues.push({
        path: `areas[${i}].name`,
        message: `area name "${area.name}" must be kebab-case`,
      });
    }

    if (seenNames.has(area.name)) {
      issues.push({
        path: `areas[${i}].name`,
        message: `duplicate area name "${area.name}"`,
      });
    } else {
      seenNames.add(area.name);
    }

    if (area.name.endsWith(REST_SUFFIX)) {
      restAreas.push({ index: i, area });
      continue;
    }

    if (area.files.length === 0) {
      issues.push({
        path: `areas[${i}].files`,
        message: `base area "${area.name}" must contain at least one file`,
      });
    }

    const filesInArea = new Set<string>();
    for (let j = 0; j < area.files.length; j += 1) {
      const file = area.files[j];
      if (file === undefined) {
        continue;
      }
      if (!scopeSet.has(file)) {
        issues.push({
          path: `areas[${i}].files[${j}]`,
          message: `unknown path "${file}" is not in scope`,
        });
        continue;
      }
      const existingOwner = ownerByFile.get(file);
      if (existingOwner !== undefined) {
        issues.push({
          path: `areas[${i}].files[${j}]`,
          message: `path "${file}" is already assigned to area "${existingOwner}"`,
        });
        continue;
      }
      ownerByFile.set(file, area.name);
      filesInArea.add(file);
    }

    if (!baseAreaFiles.has(area.name)) {
      baseAreaFiles.set(area.name, filesInArea);
    }
  }

  for (const file of scopeFiles) {
    if (!ownerByFile.has(file)) {
      issues.push({
        path: "areas",
        message: `scope path "${file}" is not covered by any base area`,
      });
    }
  }

  for (const { index, area } of restAreas) {
    const baseName = area.name.slice(0, -REST_SUFFIX.length);
    const baseFiles = baseAreaFiles.get(baseName);
    if (baseFiles === undefined) {
      issues.push({
        path: `areas[${index}].name`,
        message: `-rest area "${area.name}" requires base area "${baseName}"`,
      });
      continue;
    }

    if (area.files.length === 0) {
      issues.push({
        path: `areas[${index}].files`,
        message: `-rest area "${area.name}" must be a non-empty subset of "${baseName}"`,
      });
      continue;
    }

    const seenInRest = new Set<string>();
    for (let j = 0; j < area.files.length; j += 1) {
      const file = area.files[j];
      if (file === undefined) {
        continue;
      }
      if (!baseFiles.has(file)) {
        issues.push({
          path: `areas[${index}].files[${j}]`,
          message: `path "${file}" in "${area.name}" is not in base area "${baseName}"`,
        });
      } else if (seenInRest.has(file)) {
        issues.push({
          path: `areas[${index}].files[${j}]`,
          message: `duplicate path "${file}" in "${area.name}"`,
        });
      } else {
        seenInRest.add(file);
      }
    }
  }

  const enriched: Area[] = areas.map((area) => {
    let totalLines = 0;
    for (const file of area.files) {
      totalLines += sizesByFile.get(file) ?? 0;
    }
    return {
      name: area.name,
      lines: totalLines,
      files: [...area.files],
    };
  });

  return { issues, areas: enriched };
};

export const validateDesignReport = (report: DesignReport): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  validateUniqueFindingIds(report.findings, "findings", new Set<string>(), issues);
  return issues;
};

export const validateHunterReport = (
  report: HunterReport,
  options: { singleArea: boolean },
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  validateUniqueFindingIds(report.findings, "findings", new Set<string>(), issues);

  if (
    options.singleArea &&
    (report.houseShape === undefined || report.houseShape.trim().length === 0)
  ) {
    issues.push({
      path: "houseShape",
      message: "houseShape is required when singleArea is true",
    });
  }

  for (let i = 0; i < report.notReadInFull.length; i += 1) {
    const entry = report.notReadInFull[i];
    if (entry === undefined || !isRelativePath(entry)) {
      issues.push({
        path: `notReadInFull[${i}]`,
        message: `notReadInFull entry "${entry ?? ""}" must be a non-empty relative path`,
      });
    }
  }

  return issues;
};

export const validateVerifyAgainstReport = (
  verify: VerifyReport,
  targetReport: DesignReport | HunterReport,
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  const expectedFindingIds = new Set(targetReport.findings.map((finding) => finding.id));
  const seenVerdictTargets = new Set<string>();
  for (let i = 0; i < verify.verdicts.length; i += 1) {
    const verdict = verify.verdicts[i];
    if (verdict === undefined) {
      continue;
    }
    if (seenVerdictTargets.has(verdict.target)) {
      issues.push({
        path: `verdicts[${i}].target`,
        message: `duplicate verdict target "${verdict.target}"`,
      });
    } else if (!expectedFindingIds.has(verdict.target)) {
      issues.push({
        path: `verdicts[${i}].target`,
        message: `unknown finding target "${verdict.target}" not present in report`,
      });
    } else {
      seenVerdictTargets.add(verdict.target);
    }
  }

  for (const finding of targetReport.findings) {
    if (!seenVerdictTargets.has(finding.id)) {
      issues.push({
        path: "verdicts",
        message: `missing verdict for finding "${finding.id}"`,
      });
    }
  }

  const allAlsoNoticedWheres = new Set(targetReport.alsoNoticed.map((entry) => entry.where));
  const requiredAlsoNoticedWheres = new Set(
    targetReport.alsoNoticed
      .filter((entry) => entry.tag === "data-loss" || entry.tag === "security")
      .map((entry) => entry.where),
  );
  const seenAlsoNoticedWheres = new Set<string>();
  for (let i = 0; i < verify.alsoNoticedVerdicts.length; i += 1) {
    const verdict = verify.alsoNoticedVerdicts[i];
    if (verdict === undefined) {
      continue;
    }
    if (seenAlsoNoticedWheres.has(verdict.where)) {
      issues.push({
        path: `alsoNoticedVerdicts[${i}].where`,
        message: `duplicate alsoNoticed verdict target "${verdict.where}"`,
      });
    } else if (!allAlsoNoticedWheres.has(verdict.where)) {
      issues.push({
        path: `alsoNoticedVerdicts[${i}].where`,
        message: `unknown alsoNoticed target "${verdict.where}" not present in report`,
      });
    } else {
      seenAlsoNoticedWheres.add(verdict.where);
    }
  }

  for (const where of requiredAlsoNoticedWheres) {
    if (!seenAlsoNoticedWheres.has(where)) {
      issues.push({
        path: "alsoNoticedVerdicts",
        message: `missing verdict for tagged alsoNoticed entry "${where}"`,
      });
    }
  }

  const expectedCleanupWheres = new Set(targetReport.cleanup.map((entry) => entry.where));
  const seenCleanupWheres = new Set<string>();
  for (let i = 0; i < verify.cleanupVerdicts.length; i += 1) {
    const verdict = verify.cleanupVerdicts[i];
    if (verdict === undefined) {
      continue;
    }
    if (seenCleanupWheres.has(verdict.where)) {
      issues.push({
        path: `cleanupVerdicts[${i}].where`,
        message: `duplicate cleanup verdict target "${verdict.where}"`,
      });
    } else if (!expectedCleanupWheres.has(verdict.where)) {
      issues.push({
        path: `cleanupVerdicts[${i}].where`,
        message: `unknown cleanup target "${verdict.where}" not present in report`,
      });
    } else {
      seenCleanupWheres.add(verdict.where);
    }
  }

  for (const entry of targetReport.cleanup) {
    if (!seenCleanupWheres.has(entry.where)) {
      issues.push({
        path: "cleanupVerdicts",
        message: `missing verdict for cleanup entry "${entry.where}"`,
      });
    }
  }

  return issues;
};

export const validateSlopAudit = (audit: SlopAudit): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (audit.tldr.trim().length === 0) {
    issues.push({
      path: "tldr",
      message: "tldr must be non-empty",
    });
  }

  if (audit.weightMap.length === 0) {
    issues.push({
      path: "weightMap",
      message: "weightMap must contain at least one entry",
    });
  }

  if (audit.needsFromYou.length === 0) {
    issues.push({
      path: "needsFromYou",
      message: "needsFromYou must contain at least one entry",
    });
  }

  const seenFindingIds = new Set<string>();
  const sections: ReadonlyArray<{
    name: "design" | "code";
    items: ReadonlyArray<SlopAudit["design"][number]>;
  }> = [
    { name: "design", items: audit.design },
    { name: "code", items: audit.code },
  ];

  for (const { name, items } of sections) {
    validateUniqueFindingIds(items, name, seenFindingIds, issues);
  }

  return issues;
};
