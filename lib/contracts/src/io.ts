import fs from "node:fs";
import path from "node:path";
import YAML, { isMap, isPair, isScalar, isSeq, Scalar } from "yaml";
import { z } from "zod";
import { ReviewReportSchema } from "./report-schemas.ts";
import type { OracleCaseRef, ValidationIssue } from "./spec-schema.ts";

const findFoldedScalars = (node: unknown, currentPath: string, found: string[]): void => {
  if (isScalar(node)) {
    if (node.type === Scalar.BLOCK_FOLDED) {
      found.push(currentPath.length > 0 ? currentPath : "(root)");
    }
    return;
  }
  if (isMap(node)) {
    for (const item of node.items) {
      if (!isPair(item)) {
        continue;
      }
      const key = isScalar(item.key) ? String(item.key.value) : String(item.key);
      const nextPath = currentPath.length > 0 ? `${currentPath}.${key}` : key;
      findFoldedScalars(item.value, nextPath, found);
    }
    return;
  }
  if (isSeq(node)) {
    for (let i = 0; i < node.items.length; i += 1) {
      findFoldedScalars(node.items[i], `${currentPath}[${i}]`, found);
    }
  }
};

const OracleConfKindSchema = z.object({
  kind: z.enum(["api-contract", "browser", "cli"]),
});

const formatZodError = (error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const location = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${location}: ${issue.message}`;
    })
    .join("; ");

export const readYamlFile = (
  filePath: string,
): { ok: true; data: unknown } | { ok: false; error: string } => {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read ${filePath}: ${message}` };
  }

  try {
    const doc = YAML.parseDocument(content);
    if (doc.errors.length > 0) {
      const firstError = doc.errors[0];
      return {
        ok: false,
        error: `Failed to parse YAML in ${filePath}: ${firstError?.message ?? "syntax error"}`,
      };
    }
    const folded: string[] = [];
    findFoldedScalars(doc.contents, "", folded);
    if (folded.length > 0) {
      return {
        ok: false,
        error: `Folded block scalars (> or >-) are disallowed in ${filePath} at: ${folded.join(", ")}. Use literal block scalars (|-) or single-line strings instead.`,
      };
    }
    const data: unknown = doc.toJS();
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to parse YAML in ${filePath}: ${message}` };
  }
};

export const validateOracleCaseOnDisk = (oracleCase: OracleCaseRef): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const resolvedDir = path.resolve(oracleCase.path);

  let isDir = false;
  try {
    isDir = fs.statSync(resolvedDir).isDirectory();
  } catch {
    isDir = false;
  }

  if (!isDir) {
    issues.push({
      path: "oracleCase.path",
      message: `oracle case directory not found: ${oracleCase.path}`,
    });
    return issues;
  }

  const confPath = path.join(resolvedDir, "oracle.conf.json");
  let hasConf = false;
  try {
    hasConf = fs.statSync(confPath).isFile();
  } catch {
    hasConf = false;
  }

  if (!hasConf) {
    issues.push({
      path: "oracleCase.path",
      message: `missing oracle.conf.json in ${oracleCase.path}`,
    });
  } else {
    let rawConf: unknown;
    let parsedJson = false;
    try {
      rawConf = JSON.parse(fs.readFileSync(confPath, "utf8"));
      parsedJson = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      issues.push({
        path: "oracleCase.path",
        message: `failed to parse oracle.conf.json in ${oracleCase.path}: ${message}`,
      });
    }

    if (parsedJson) {
      const parsedConf = OracleConfKindSchema.safeParse(rawConf);
      if (!parsedConf.success) {
        issues.push({
          path: "oracleCase.kind",
          message: `oracle.conf.json in ${oracleCase.path} has missing or invalid kind`,
        });
      } else if (parsedConf.data.kind !== oracleCase.kind) {
        issues.push({
          path: "oracleCase.kind",
          message: `oracleCase.kind "${oracleCase.kind}" does not match oracle.conf.json kind "${parsedConf.data.kind}"`,
        });
      }
    }
  }

  const lockedPath = path.join(resolvedDir, "locked.json");
  let hasLocked = false;
  try {
    hasLocked = fs.statSync(lockedPath).isFile();
  } catch {
    hasLocked = false;
  }

  if (!hasLocked) {
    issues.push({
      path: "oracleCase.path",
      message: `missing locked.json in ${oracleCase.path}`,
    });
  }

  let hasOracleYaml = false;
  try {
    const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
    hasOracleYaml = entries.some((entry) => entry.isFile() && entry.name.endsWith(".oracle.yaml"));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push({
      path: "oracleCase.path",
      message: `failed to read directory ${oracleCase.path}: ${message}`,
    });
    return issues;
  }

  if (!hasOracleYaml) {
    issues.push({
      path: "oracleCase.path",
      message: `no *.oracle.yaml files found in ${oracleCase.path}`,
    });
  }

  return issues;
};

const StateMissedReportsSchema = z.object({
  missedReports: z.array(z.string()).optional(),
});

const readMissedReportsFromState = (runDir: string): ReadonlySet<string> => {
  const statePath = path.join(runDir, "state.json");
  if (!fs.existsSync(statePath)) {
    return new Set();
  }
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const parsed = StateMissedReportsSchema.safeParse(raw);
    if (!parsed.success || parsed.data.missedReports === undefined) {
      return new Set();
    }
    return new Set(parsed.data.missedReports);
  } catch {
    return new Set();
  }
};

export const loadRunReviewFindings = (
  runDir: string,
  missedReports?: ReadonlySet<string>,
):
  | { ok: true; findings: Array<{ report: string; id: string; do: string }> }
  | { ok: false; error: string } => {
  const resolvedDir = path.resolve(runDir);
  const missedSet = missedReports ?? readMissedReportsFromState(resolvedDir);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read run directory ${runDir}: ${message}` };
  }

  const reviewFiles = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith("review-") &&
        entry.name.endsWith(".yaml") &&
        !missedSet.has(entry.name),
    )
    .map((entry) => entry.name)
    .sort();

  const findings: Array<{ report: string; id: string; do: string }> = [];

  for (const fileName of reviewFiles) {
    const filePath = path.join(resolvedDir, fileName);
    const loaded = readYamlFile(filePath);
    if (!loaded.ok) {
      return { ok: false, error: loaded.error };
    }

    const parsed = ReviewReportSchema.safeParse(loaded.data);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Invalid review report ${fileName}: ${formatZodError(parsed.error)}`,
      };
    }

    for (const finding of parsed.data.findings) {
      findings.push({
        report: fileName,
        id: finding.id,
        do: finding.do,
      });
    }
  }

  return { ok: true, findings };
};
