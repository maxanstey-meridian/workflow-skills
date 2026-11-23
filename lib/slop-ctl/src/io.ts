import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { z } from "zod";
import { readYamlFile } from "../../contracts/src/io.ts";
import { AREAS_FILE_NAME, SCOPE_FILE_NAME, SIZES_FILE_NAME } from "./briefs.ts";
import { type SlopState, SlopStateSchema } from "./schemas.ts";
import {
  formatZodIssues,
  type RawYamlEntry,
  type SlopEffects,
  type SlopSnapshot,
} from "./transition.ts";

const STATE_FILE_NAME = "state.json";

const isNodeErrorWithCode = (err: unknown, code: string): boolean =>
  err instanceof Error && "code" in err && err.code === code;

export const writeTextAtomic = (filePath: string, content: string): void => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`,
  );
  fs.writeFileSync(tmpPath, content, "utf8");
  try {
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    fs.rmSync(tmpPath, { force: true });
    throw err;
  }
};

export const writeYamlAtomic = (filePath: string, doc: unknown): void => {
  writeTextAtomic(filePath, YAML.stringify(doc, { lineWidth: 0 }));
};

export const writeJsonAtomic = (filePath: string, doc: unknown): void => {
  writeTextAtomic(filePath, `${JSON.stringify(doc, null, 2)}\n`);
};

export type ReadTypedYamlResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "io"; error: string }
  | { ok: false; kind: "validation"; details: string[] };

export const readTypedYamlFile = <T>(
  filePath: string,
  schema: z.ZodType<T>,
): ReadTypedYamlResult<T> => {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, kind: "io", error: `Failed to read ${filePath}: ${message}` };
  }

  const loaded = readYamlFile(filePath);
  if (!loaded.ok) {
    return { ok: false, kind: "validation", details: [loaded.error] };
  }

  const parsed = schema.safeParse(loaded.data);
  if (!parsed.success) {
    return { ok: false, kind: "validation", details: formatZodIssues(parsed.error) };
  }

  return { ok: true, data: parsed.data };
};

export const readListFile = (filePath: string): string[] => {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, "utf8");
  return content
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.length > 0);
};

export const writeListFile = (filePath: string, lines: ReadonlyArray<string>): void => {
  const content = lines.length > 0 ? `${lines.join("\n")}\n` : "";
  writeTextAtomic(filePath, content);
};

export const readSizesFile = (
  filePath: string,
): { ok: true; sizesByFile: Map<string, number> } | { ok: false; error: string } => {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read ${filePath}: ${message}` };
  }

  const sizesByFile = new Map<string, number>();
  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.length === 0) {
      continue;
    }
    const tabIdx = line.indexOf("\t");
    if (tabIdx === -1) {
      continue;
    }
    const count = Number.parseInt(line.slice(0, tabIdx).trim(), 10);
    const relPath = line.slice(tabIdx + 1);
    if (!Number.isNaN(count) && relPath.length > 0) {
      sizesByFile.set(relPath, count);
    }
  }

  return { ok: true, sizesByFile };
};

export const readState = (
  runDir: string,
): { ok: true; state: SlopState } | { ok: false; error: string } => {
  const statePath = path.join(runDir, STATE_FILE_NAME);
  let content: string;
  try {
    content = fs.readFileSync(statePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read ${statePath}: ${message}` };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to parse JSON in ${statePath}: ${message}` };
  }

  const parsed = SlopStateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: `Invalid state.json: ${formatZodIssues(parsed.error).join("; ")}`,
    };
  }
  return { ok: true, state: parsed.data };
};

export const writeState = (runDir: string, state: SlopState): void => {
  writeJsonAtomic(path.join(runDir, STATE_FILE_NAME), state);
};

const formatTimestamp = (now: Date): string => {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

export const createRunDir = (mainDir: string, now: Date = new Date()): string => {
  const scratchDir = path.join(mainDir, ".plans", "scratch");
  fs.mkdirSync(scratchDir, { recursive: true });
  const baseName = `slop-hunt-${formatTimestamp(now)}`;
  let suffix = 0;
  for (;;) {
    const candidate =
      suffix === 0
        ? path.join(scratchDir, baseName)
        : path.join(scratchDir, `${baseName}-${suffix}`);
    try {
      fs.mkdirSync(candidate);
      return candidate;
    } catch (err) {
      if (isNodeErrorWithCode(err, "EEXIST")) {
        suffix += 1;
        continue;
      }
      throw err;
    }
  }
};

const readRawYamlEntry = (filePath: string): RawYamlEntry => {
  if (!fs.existsSync(filePath)) {
    return { exists: false };
  }
  const loaded = readYamlFile(filePath);
  if (!loaded.ok) {
    return { exists: true, parseError: loaded.error };
  }
  return { exists: true, raw: loaded.data };
};

export const loadHuntSnapshot = (
  runDir: string,
): { ok: true; snapshot: SlopSnapshot } | { ok: false; error: string } => {
  const scopePath = path.join(runDir, SCOPE_FILE_NAME);
  if (!fs.existsSync(scopePath)) {
    return { ok: false, error: `Missing scope file: ${scopePath}` };
  }
  const scopeFiles = readListFile(scopePath);

  const sizesResult = readSizesFile(path.join(runDir, SIZES_FILE_NAME));
  if (!sizesResult.ok) {
    return sizesResult;
  }

  const areasYaml = readRawYamlEntry(path.join(runDir, AREAS_FILE_NAME));

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(runDir, { withFileTypes: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to read run directory ${runDir}: ${message}` };
  }

  const reports = new Map<string, RawYamlEntry>();
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".yaml") || entry.name === AREAS_FILE_NAME) {
      continue;
    }
    reports.set(entry.name, readRawYamlEntry(path.join(runDir, entry.name)));
  }

  return {
    ok: true,
    snapshot: {
      scopeFiles,
      sizesByFile: sizesResult.sizesByFile,
      areasYaml,
      reports,
    },
  };
};

export const applySlopEffects = (runDir: string, effects: SlopEffects): void => {
  if (effects.writeAreas !== undefined) {
    writeYamlAtomic(path.join(runDir, AREAS_FILE_NAME), effects.writeAreas);
  }
  if (effects.renderReport !== undefined) {
    writeTextAtomic(effects.renderReport.reportPath, effects.renderReport.markdown);
  }
};
