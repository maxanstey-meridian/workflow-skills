import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { z } from "zod";
import { readYamlFile } from "../../contracts/src/io.ts";
import { containsToken, type JUnitTestCase, parseJUnitXml } from "./junit.ts";
import { formatZodError, type LoadedOracleFile, OracleFileSchema } from "./schema.ts";

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "bin", "obj", ".nuxt", ".output"]);

export const sha256File = (filePath: string): string =>
  createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

export const readJsonFile = <T>(
  filePath: string,
  schema: z.ZodType<T>,
  label: string,
): { ok: true; data: T } | { ok: false; error: string } => {
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `${label} not found: ${filePath}` };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `${label} is not valid JSON: ${msg}` };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: `${label} failed schema validation: ${formatZodError(parsed.error)}`,
    };
  }
  return { ok: true, data: parsed.data };
};

export const readTypedYamlFile = <T>(
  filePath: string,
  schema: z.ZodType<T>,
  label: string,
): { ok: true; data: T } | { ok: false; error: string } => {
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `${label} not found: ${filePath}` };
  }
  const loaded = readYamlFile(filePath);
  if (!loaded.ok) {
    return { ok: false, error: `${label}: ${loaded.error}` };
  }
  const parsed = schema.safeParse(loaded.data);
  if (!parsed.success) {
    return {
      ok: false,
      error: `${label} failed schema validation: ${formatZodError(parsed.error)}`,
    };
  }
  return { ok: true, data: parsed.data };
};

const writeAtomicText = (filePath: string, content: string): void => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(tmpPath, content, "utf8");
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      fs.rmSync(tmpPath, { force: true });
    }
    throw err;
  }
};

export const writeJsonAtomic = (filePath: string, data: unknown): void => {
  writeAtomicText(filePath, `${JSON.stringify(data, null, 2)}\n`);
};

export const writeYamlAtomic = (filePath: string, doc: unknown): void => {
  writeAtomicText(filePath, YAML.stringify(doc, { lineWidth: 0 }));
};

export const resolveRowScript = (
  caseDir: string,
  rowsCmd: readonly string[],
): { token: string; absPath: string } | null => {
  for (let i = rowsCmd.length - 1; i >= 0; i -= 1) {
    const token = rowsCmd[i];
    if (token === undefined) {
      continue;
    }
    const candidate = path.resolve(caseDir, token);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { token, absPath: candidate };
    }
  }
  return null;
};

export const loadOracleFiles = (
  caseDir: string,
): { ok: true; files: LoadedOracleFile[] } | { ok: false; errors: string[] } => {
  if (!fs.existsSync(caseDir) || !fs.statSync(caseDir).isDirectory()) {
    return { ok: false, errors: [`Case directory not found: ${caseDir}`] };
  }
  const entries = fs
    .readdirSync(caseDir)
    .filter((name) => name.endsWith(".oracle.yaml"))
    .sort();

  const files: LoadedOracleFile[] = [];
  const errors: string[] = [];

  for (const fileName of entries) {
    const filePath = path.join(caseDir, fileName);
    const loaded = readTypedYamlFile(filePath, OracleFileSchema, fileName);
    if (!loaded.ok) {
      errors.push(loaded.error);
    } else {
      files.push({ fileName, filePath, data: loaded.data });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, files };
};

export const collectCandidateFiles = (paths: readonly string[]): string[] => {
  const files: string[] = [];

  const walk = (target: string): void => {
    const abs = path.resolve(target);
    if (!fs.existsSync(abs)) {
      return;
    }
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
      files.push(abs);
      return;
    }
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (IGNORED_DIRS.has(entry.name)) {
            continue;
          }
          walk(path.join(abs, entry.name));
        } else if (entry.isFile()) {
          files.push(path.join(abs, entry.name));
        }
      }
    }
  };

  for (const p of paths) {
    walk(p);
  }
  return [...new Set(files)].sort();
};

export const resolveTestFile = (
  caseDir: string,
  tc: JUnitTestCase,
  rowId: string,
  candidateFiles: readonly string[],
  fileContentCache: Map<string, string>,
): { ok: true; absPath: string } | { ok: false; error: string } => {
  if (tc.file !== undefined) {
    const fromCwd = path.resolve(tc.file);
    if (fs.existsSync(fromCwd) && fs.statSync(fromCwd).isFile()) {
      return { ok: true, absPath: fromCwd };
    }
    const fromCase = path.resolve(caseDir, tc.file);
    if (fs.existsSync(fromCase) && fs.statSync(fromCase).isFile()) {
      return { ok: true, absPath: fromCase };
    }
  }

  const readCached = (filePath: string): string => {
    const cached = fileContentCache.get(filePath);
    if (cached !== undefined) {
      return cached;
    }
    const text = fs.readFileSync(filePath, "utf8");
    fileContentCache.set(filePath, text);
    return text;
  };

  let matches = candidateFiles.filter((f) => containsToken(readCached(f), tc.name));
  if (matches.length === 0 && rowId !== tc.name) {
    matches = candidateFiles.filter((f) => containsToken(readCached(f), rowId));
  }

  if (matches.length === 1 && matches[0] !== undefined) {
    return { ok: true, absPath: matches[0] };
  }
  if (matches.length === 0) {
    return {
      ok: false,
      error: `could not resolve test file for row "${rowId}" (test "${tc.name}")`,
    };
  }
  return {
    ok: false,
    error: `ambiguous test file for row "${rowId}" (test "${tc.name}"): ${matches.join(", ")}`,
  };
};

export const readJUnitFiles = (
  xmlPaths: readonly string[],
): { ok: true; cases: JUnitTestCase[] } | { ok: false; error: string } => {
  const cases: JUnitTestCase[] = [];

  for (const xmlPath of xmlPaths) {
    const abs = path.resolve(xmlPath);
    if (!fs.existsSync(abs)) {
      return { ok: false, error: `JUnit XML file not found: ${abs}` };
    }
    const content = fs.readFileSync(abs, "utf8");
    cases.push(...parseJUnitXml(content));
  }

  return { ok: true, cases };
};
