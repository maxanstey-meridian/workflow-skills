import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { z } from "zod";
import { readYamlFile, validateOracleCaseOnDisk } from "../../contracts/src/io.ts";
import { type Spec, SpecSchema } from "../../contracts/src/spec-schema.ts";
import { validateSpec } from "../../contracts/src/spec-validate.ts";
import { type GoState, GoStateSchema } from "./state.ts";
import type { DiskReportEntry, ReportsOnDisk } from "./transition.ts";

const STATE_FILE_NAME = "state.json";

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

const pad2 = (value: number): string => String(value).padStart(2, "0");

const formatArchiveStamp = (date: Date): string =>
  `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;

export const archiveExistingRunDir = (runDir: string, now: Date = new Date()): string | null => {
  if (!fs.existsSync(runDir)) {
    return null;
  }

  const baseTarget = `${runDir}-${formatArchiveStamp(now)}`;
  let target = baseTarget;
  let suffix = 1;
  while (fs.existsSync(target)) {
    target = `${baseTarget}-${suffix}`;
    suffix += 1;
  }

  fs.renameSync(runDir, target);
  return target;
};

export const readStateFile = (
  runDir: string,
): { ok: true; state: GoState } | { ok: false; error: string } => {
  const filePath = path.join(runDir, STATE_FILE_NAME);
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read ${filePath}: ${message}` };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to parse JSON in ${filePath}: ${message}` };
  }

  const validated = GoStateSchema.safeParse(parsedJson);
  if (!validated.success) {
    return {
      ok: false,
      error: `Invalid state in ${filePath}: ${formatZodIssues(validated.error).join("; ")}`,
    };
  }

  return { ok: true, state: validated.data };
};

export const writeStateFile = (runDir: string, state: GoState): void => {
  fs.mkdirSync(runDir, { recursive: true });
  const filePath = path.join(runDir, STATE_FILE_NAME);
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
};

export type ReadSpecResult =
  | { ok: true; spec: Spec }
  | { ok: false; kind: "io"; error: string }
  | { ok: false; kind: "validation"; details: string[] };

export const readSpecFile = (specPath: string): ReadSpecResult => {
  let content: string;
  try {
    content = fs.readFileSync(specPath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, kind: "io", error: `Failed to read ${specPath}: ${message}` };
  }

  let data: unknown;
  try {
    data = YAML.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      kind: "validation",
      details: [`Failed to parse YAML in ${specPath}: ${message}`],
    };
  }

  const parsed = SpecSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, kind: "validation", details: formatZodIssues(parsed.error) };
  }

  const issues = validateSpec(parsed.data);
  if (parsed.data.oracleCase !== undefined) {
    issues.push(...validateOracleCaseOnDisk(parsed.data.oracleCase));
  }
  if (issues.length > 0) {
    return {
      ok: false,
      kind: "validation",
      details: issues.map((issue) => `${issue.path}: ${issue.message}`),
    };
  }

  return { ok: true, spec: parsed.data };
};

export const writeSpecFile = (specPath: string, spec: Spec): void => {
  fs.writeFileSync(specPath, YAML.stringify(spec, { lineWidth: 0 }), "utf8");
};

export const loadReportsOnDisk = (
  runDir: string,
): { ok: true; reports: ReportsOnDisk } | { ok: false; error: string } => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(runDir, { withFileTypes: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read run directory ${runDir}: ${message}` };
  }

  const reports: Record<string, DiskReportEntry> = {};
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml")) {
      continue;
    }
    const loaded = readYamlFile(path.join(runDir, entry.name));
    if (loaded.ok) {
      reports[entry.name] = { kind: "ok", data: loaded.data };
    } else {
      reports[entry.name] = { kind: "read-error", error: loaded.error };
    }
  }

  return { ok: true, reports };
};

export const writeTextFile = (filePath: string, content: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
};
