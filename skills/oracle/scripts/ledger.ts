#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { Command } from "commander";
import YAML from "yaml";
import { z } from "zod";
import { formatLintFinding, lintTestFile } from "./lint.ts";
import {
  ClaimsFileSchema,
  FrozenSchema,
  LockedSchema,
  normaliseId,
  OracleConfSchema,
  OracleFileSchema,
  rowLockHash,
  RowScriptLineSchema,
  RunStateSchema,
  validateOracleFile,
  type BrowserRow,
  type Locked,
  type OracleConf,
  type OracleFile,
  type OracleRow,
  type RunColour,
  type RunRowState,
  type RunState,
  type SimpleRow,
  type UnplacedItem,
} from "./schema.ts";

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "bin",
  "obj",
  ".nuxt",
  ".output",
]);

const sha256File = (filePath: string): string =>
  createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

const formatZodError = (err: z.ZodError): string =>
  err.issues
    .map((issue) => {
      const loc = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `${loc}: ${issue.message}`;
    })
    .join("; ");

const readJsonFile = <T>(
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

const readYamlFile = <T>(
  filePath: string,
  schema: z.ZodType<T>,
  label: string,
): { ok: true; data: T } | { ok: false; error: string } => {
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `${label} not found: ${filePath}` };
  }
  let raw: unknown;
  try {
    raw = YAML.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `${label} is not valid YAML: ${msg}` };
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

const resolveRowScript = (
  caseDir: string,
  rowsCmd: string[],
): { token: string; absPath: string } | null => {
  for (let i = rowsCmd.length - 1; i >= 0; i -= 1) {
    const token = rowsCmd[i];
    if (token === undefined) continue;
    const candidate = path.resolve(caseDir, token);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { token, absPath: candidate };
    }
  }
  return null;
};

type LoadedOracleFile = {
  fileName: string;
  filePath: string;
  data: OracleFile;
};

const loadOracleFiles = (
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
    const loaded = readYamlFile(filePath, OracleFileSchema, fileName);
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

const checkLock = (
  caseDir: string,
  conf: OracleConf,
  files: LoadedOracleFile[],
): { ok: true; locked: Locked } | { ok: false; errors: string[] } => {
  const lockedPath = path.join(caseDir, "locked.json");
  const loaded = readJsonFile(lockedPath, LockedSchema, "locked.json");
  if (!loaded.ok) {
    return { ok: false, errors: [loaded.error] };
  }
  const locked = loaded.data;
  const errors: string[] = [];

  if (locked.kind !== conf.kind) {
    errors.push(
      `locked.json kind "${locked.kind}" does not match oracle.conf.json kind "${conf.kind}"`,
    );
  }

  const seenIds = new Set<string>();
  for (const file of files) {
    for (const row of file.data.rows) {
      seenIds.add(row.id);
      const expectedHash = locked.rows[row.id];
      if (expectedHash === undefined) {
        errors.push(`row "${row.id}" in ${file.fileName} is not locked`);
      } else {
        const actualHash = rowLockHash(row);
        if (actualHash !== expectedHash) {
          errors.push(
            `row "${row.id}" in ${file.fileName} drifted from locked.json`,
          );
        }
      }
    }
  }

  for (const lockedId of Object.keys(locked.rows)) {
    if (!seenIds.has(lockedId)) {
      errors.push(`locked row "${lockedId}" is missing from *.oracle.yaml`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, locked };
};

const validateCase = (
  caseDir: string,
):
  | { ok: true; conf: OracleConf; files: LoadedOracleFile[] }
  | { ok: false; errors: string[] } => {
  const confRes = readJsonFile(
    path.join(caseDir, "oracle.conf.json"),
    OracleConfSchema,
    "oracle.conf.json",
  );
  if (!confRes.ok) {
    return { ok: false, errors: [confRes.error] };
  }
  const conf = confRes.data;

  const filesRes = loadOracleFiles(caseDir);
  if (!filesRes.ok) {
    return { ok: false, errors: filesRes.errors };
  }
  if (filesRes.files.length === 0) {
    return { ok: false, errors: [`No *.oracle.yaml files found in ${caseDir}`] };
  }

  const errors: string[] = [];
  const normToId = new Map<string, string>();

  for (const file of filesRes.files) {
    const expectedSlice = file.fileName.replace(/\.oracle\.yaml$/, "");
    if (file.data.slice !== expectedSlice) {
      errors.push(
        `${file.fileName}: slice "${file.data.slice}" does not match filename "${expectedSlice}"`,
      );
    }
    errors.push(...validateOracleFile(file.data, conf.kind, file.fileName));
    for (const row of file.data.rows) {
      const norm = normaliseId(row.id);
      if (norm.length === 0) {
        errors.push(`${file.fileName} [${row.id}]: normalised ID is empty`);
      } else {
        const existing = normToId.get(norm);
        if (existing !== undefined) {
          errors.push(
            `${file.fileName} [${row.id}]: normalised-ID collision with "${existing}"`,
          );
        } else {
          normToId.set(norm, row.id);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, conf, files: filesRes.files };
};

const cmdFreeze = (caseArg: string, words: string): number => {
  const caseDir = path.resolve(caseArg);
  if (words.trim().length === 0) {
    console.error("freeze: --words must be non-empty");
    return 2;
  }

  const confRes = readJsonFile(
    path.join(caseDir, "oracle.conf.json"),
    OracleConfSchema,
    "oracle.conf.json",
  );
  if (!confRes.ok) {
    console.error(`freeze: ${confRes.error}`);
    return 2;
  }

  const script = resolveRowScript(caseDir, confRes.data.rows);
  if (!script) {
    console.error(
      `freeze: could not resolve an existing row script file from rows=${JSON.stringify(confRes.data.rows)}`,
    );
    return 2;
  }

  const frozen = {
    date: new Date().toISOString(),
    words: words.trim(),
    command: confRes.data.rows,
    script: {
      file: script.token,
      sha256: sha256File(script.absPath),
    },
  };

  fs.writeFileSync(
    path.join(caseDir, "frozen.json"),
    `${JSON.stringify(frozen, null, 2)}\n`,
    "utf8",
  );
  console.log(`Frozen ${script.token} (${frozen.script.sha256.slice(0, 12)})`);
  return 0;
};

type DiscoveredRow = {
  id: string;
  slice: string;
  where?: string;
  meta?: Record<string, string>;
  when?: string;
};

type DiscoveredUnplaced = {
  id: string;
  slice: string;
  reason: string;
  where?: string;
};

const mergeBrowserRow = (
  stub: DiscoveredRow,
  existing: OracleRow | undefined,
): BrowserRow => {
  if (existing !== undefined) {
    const expectVal =
      existing.expect !== null && typeof existing.expect !== "string"
        ? existing.expect
        : null;
    const allowKeyboard =
      "allowKeyboard" in existing ? existing.allowKeyboard : undefined;
    return {
      id: stub.id,
      ...(stub.where !== undefined ? { where: stub.where } : {}),
      ...(stub.meta !== undefined ? { meta: stub.meta } : {}),
      status: existing.status,
      when: existing.when ?? stub.when ?? null,
      expect: expectVal,
      source: existing.source,
      ...(existing.sourceRef !== undefined ? { sourceRef: existing.sourceRef } : {}),
      shortfall: existing.shortfall,
      reason: existing.reason,
      question: existing.question,
      ...(allowKeyboard !== undefined ? { allowKeyboard } : {}),
    };
  }
  return {
    id: stub.id,
    ...(stub.where !== undefined ? { where: stub.where } : {}),
    ...(stub.meta !== undefined ? { meta: stub.meta } : {}),
    status: "active",
    when: stub.when ?? null,
    expect: null,
    source: null,
    shortfall: null,
    reason: null,
    question: null,
  };
};

const mergeSimpleRow = (
  stub: DiscoveredRow,
  existing: OracleRow | undefined,
): SimpleRow => {
  if (existing !== undefined) {
    const expectVal = typeof existing.expect === "string" ? existing.expect : null;
    return {
      id: stub.id,
      ...(stub.where !== undefined ? { where: stub.where } : {}),
      ...(stub.meta !== undefined ? { meta: stub.meta } : {}),
      status: existing.status,
      when: existing.when ?? stub.when ?? null,
      expect: expectVal,
      source: existing.source,
      ...(existing.sourceRef !== undefined ? { sourceRef: existing.sourceRef } : {}),
      shortfall: existing.shortfall,
      reason: existing.reason,
      question: existing.question,
    };
  }
  return {
    id: stub.id,
    ...(stub.where !== undefined ? { where: stub.where } : {}),
    ...(stub.meta !== undefined ? { meta: stub.meta } : {}),
    status: "active",
    when: stub.when ?? null,
    expect: null,
    source: null,
    shortfall: null,
    reason: null,
    question: null,
  };
};

const cmdRows = (caseArg: string, draft: boolean): number => {
  const caseDir = path.resolve(caseArg);
  const confRes = readJsonFile(
    path.join(caseDir, "oracle.conf.json"),
    OracleConfSchema,
    "oracle.conf.json",
  );
  if (!confRes.ok) {
    console.error(`rows: ${confRes.error}`);
    return 2;
  }
  const conf = confRes.data;

  if (!draft) {
    const frozenRes = readJsonFile(
      path.join(caseDir, "frozen.json"),
      FrozenSchema,
      "frozen.json",
    );
    if (!frozenRes.ok) {
      console.error(`rows: ${frozenRes.error} (run freeze first or pass --draft)`);
      return 1;
    }
    const frozen = frozenRes.data;
    if (JSON.stringify(frozen.command) !== JSON.stringify(conf.rows)) {
      console.error("rows: oracle.conf.json rows command drifted from frozen.json");
      return 1;
    }
    const scriptPath = path.resolve(caseDir, frozen.script.file);
    if (!fs.existsSync(scriptPath)) {
      console.error(`rows: frozen script missing: ${scriptPath}`);
      return 1;
    }
    const currentHash = sha256File(scriptPath);
    if (currentHash !== frozen.script.sha256) {
      console.error("rows: row script bytes drifted from frozen.json");
      return 1;
    }
  }

  const [cmd, ...args] = conf.rows;
  if (cmd === undefined) {
    console.error("rows: empty rows command");
    return 2;
  }

  const run = spawnSync(cmd, [...args, caseDir], {
    cwd: caseDir,
    encoding: "utf8",
  });

  if (run.stderr && run.stderr.trim().length > 0) {
    process.stderr.write(run.stderr);
  }

  if (run.error) {
    console.error(`rows: failed to run row script: ${run.error.message}`);
    return 2;
  }
  if (run.status !== 0) {
    console.error(`rows: row script exited with code ${run.status ?? "null"}`);
    return 2;
  }

  const discoveredRows: DiscoveredRow[] = [];
  const discoveredUnplaced: DiscoveredUnplaced[] = [];

  const lines = run.stdout.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? "";
    if (line.length === 0) continue;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`rows: stdout line ${i + 1} is not valid JSON: ${msg}`);
      return 2;
    }
    const parsed = RowScriptLineSchema.safeParse(raw);
    if (!parsed.success) {
      console.error(
        `rows: stdout line ${i + 1} failed schema validation: ${formatZodError(parsed.error)}`,
      );
      return 2;
    }
    const item = parsed.data;
    if ("unplaced" in item) {
      discoveredUnplaced.push({
        id: item.id,
        slice: item.slice ?? "all",
        reason: item.unplaced,
        ...(item.where !== undefined ? { where: item.where } : {}),
      });
    } else {
      discoveredRows.push({
        id: item.id,
        slice: item.slice ?? "all",
        ...(item.where !== undefined ? { where: item.where } : {}),
        ...(item.meta !== undefined ? { meta: item.meta } : {}),
      });
    }
  }

  if (conf.uiStates !== undefined) {
    for (const uiState of conf.uiStates) {
      discoveredRows.push({
        id: uiState.id,
        slice: uiState.slice ?? "all",
        when: uiState.when,
      });
    }
  }

  const normToId = new Map<string, string>();
  for (const row of discoveredRows) {
    const norm = normaliseId(row.id);
    if (norm.length === 0) {
      console.error(`rows: row "${row.id}" normalises to an empty ID`);
      return 2;
    }
    const prev = normToId.get(norm);
    if (prev !== undefined) {
      console.error(
        `rows: normalised-ID collision between "${prev}" and "${row.id}"`,
      );
      return 2;
    }
    normToId.set(norm, row.id);
  }

  const existingFilesRes = loadOracleFiles(caseDir);
  if (!existingFilesRes.ok) {
    for (const err of existingFilesRes.errors) {
      console.error(`rows: ${err}`);
    }
    return 2;
  }

  const existingById = new Map<string, OracleRow>();
  const existingBySlice = new Map<string, OracleFile>();
  for (const file of existingFilesRes.files) {
    existingBySlice.set(file.data.slice, file.data);
    for (const row of file.data.rows) {
      existingById.set(row.id, row);
    }
  }

  const allDiscoveredRowIds = new Set(discoveredRows.map((r) => r.id));
  const sliceNames = new Set<string>([
    ...existingBySlice.keys(),
    ...discoveredRows.map((r) => r.slice),
    ...discoveredUnplaced.map((u) => u.slice),
  ]);

  for (const slice of [...sliceNames].sort()) {
    const existingFile = existingBySlice.get(slice);
    const sliceStubs = discoveredRows.filter((r) => r.slice === slice);
    const sliceUnplacedStubs = discoveredUnplaced.filter((u) => u.slice === slice);

    const existingUnplacedById = new Map<string, UnplacedItem>();
    for (const u of existingFile?.unplaced ?? []) {
      existingUnplacedById.set(u.id, u);
    }
    const discoveredUnplacedIds = new Set(sliceUnplacedStubs.map((u) => u.id));
    const mergedUnplaced: UnplacedItem[] = [];

    for (const u of sliceUnplacedStubs) {
      const prev = existingUnplacedById.get(u.id);
      mergedUnplaced.push({
        id: u.id,
        reason: u.reason,
        ...(u.where !== undefined ? { where: u.where } : {}),
        ...(prev?.struck !== undefined ? { struck: prev.struck } : {}),
      });
    }
    for (const prev of existingFile?.unplaced ?? []) {
      if (!discoveredUnplacedIds.has(prev.id)) {
        mergedUnplaced.push({ ...prev, gone: true });
      }
    }

    let doc: OracleFile;
    if (conf.kind === "browser") {
      const rows: BrowserRow[] = sliceStubs.map((stub) =>
        mergeBrowserRow(stub, existingById.get(stub.id)),
      );
      if (existingFile && existingFile.kind === "browser") {
        for (const prev of existingFile.rows) {
          if (!allDiscoveredRowIds.has(prev.id)) {
            rows.push({ ...prev, gone: true });
          }
        }
      }
      doc = {
        kind: "browser",
        slice,
        rows,
        ...(mergedUnplaced.length > 0 ? { unplaced: mergedUnplaced } : {}),
      };
    } else {
      const rows: SimpleRow[] = sliceStubs.map((stub) =>
        mergeSimpleRow(stub, existingById.get(stub.id)),
      );
      if (existingFile && existingFile.kind !== "browser") {
        for (const prev of existingFile.rows) {
          if (!allDiscoveredRowIds.has(prev.id)) {
            rows.push({ ...prev, gone: true });
          }
        }
      }
      doc = {
        kind: conf.kind,
        slice,
        rows,
        ...(mergedUnplaced.length > 0 ? { unplaced: mergedUnplaced } : {}),
      };
    }

    const outPath = path.join(caseDir, `${slice}.oracle.yaml`);
    fs.writeFileSync(outPath, YAML.stringify(doc, { lineWidth: 0 }), "utf8");
  }

  console.log(
    `Synced ${discoveredRows.length} rows and ${discoveredUnplaced.length} unplaced items across ${sliceNames.size} slice(s)`,
  );
  return 0;
};

const cmdValidate = (caseArg: string): number => {
  const caseDir = path.resolve(caseArg);
  const res = validateCase(caseDir);
  if (!res.ok) {
    for (const err of res.errors) {
      console.error(`validate: ${err}`);
    }
    return 1;
  }
  const totalRows = res.files.reduce((sum, f) => sum + f.data.rows.length, 0);
  console.log(`Valid: ${res.files.length} slice(s), ${totalRows} row(s)`);
  return 0;
};

const cmdLock = (caseArg: string): number => {
  const caseDir = path.resolve(caseArg);
  const res = validateCase(caseDir);
  if (!res.ok) {
    for (const err of res.errors) {
      console.error(`lock: ${err}`);
    }
    return 1;
  }

  const errors: string[] = [];
  const hashes: Record<string, string> = {};

  for (const file of res.files) {
    for (const row of file.data.rows) {
      if (row.question !== null) {
        errors.push(`${file.fileName} [${row.id}]: unanswered question blocks lock`);
      }
      if (row.gone === true && row.status !== "struck") {
        errors.push(
          `${file.fileName} [${row.id}]: gone row must be status "struck" before lock`,
        );
      }
      hashes[row.id] = rowLockHash(row);
    }
  }

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`lock: ${err}`);
    }
    return 1;
  }

  const locked: Locked = {
    lockedAt: new Date().toISOString(),
    kind: res.conf.kind,
    rows: hashes,
  };

  fs.writeFileSync(
    path.join(caseDir, "locked.json"),
    `${JSON.stringify(locked, null, 2)}\n`,
    "utf8",
  );
  console.log(`Locked ${Object.keys(hashes).length} row(s)`);
  return 0;
};

type JUnitTestCase = {
  name: string;
  file?: string;
  colour: RunColour;
};

const parseJUnitFiles = (
  xmlPaths: string[],
): { ok: true; cases: JUnitTestCase[] } | { ok: false; error: string } => {
  const cases: JUnitTestCase[] = [];
  const parser = new DOMParser();

  for (const xmlPath of xmlPaths) {
    const abs = path.resolve(xmlPath);
    if (!fs.existsSync(abs)) {
      return { ok: false, error: `JUnit XML file not found: ${abs}` };
    }
    const content = fs.readFileSync(abs, "utf8");
    const doc = parser.parseFromString(content, "text/xml");
    const nodes = doc.getElementsByTagName("testcase");

    for (let i = 0; i < nodes.length; i += 1) {
      const tc = nodes.item(i);
      if (!tc) continue;
      const name = tc.getAttribute("name") ?? "";
      let fileAttr = tc.getAttribute("file") ?? "";
      if (fileAttr.length === 0) {
        let parent = tc.parentNode;
        while (parent !== null) {
          if (parent.nodeType === 1 && "getAttribute" in parent) {
            const getAttr = parent.getAttribute;
            if (typeof getAttr === "function") {
              const candidate = getAttr.call(parent, "file");
              if (typeof candidate === "string" && candidate.length > 0) {
                fileAttr = candidate;
                break;
              }
            }
          }
          parent = parent.parentNode;
        }
      }

      let colour: RunColour = "green";
      if (tc.getElementsByTagName("skipped").length > 0) {
        colour = "skipped";
      } else if (tc.getElementsByTagName("error").length > 0) {
        colour = "error";
      } else if (tc.getElementsByTagName("failure").length > 0) {
        colour = "red";
      }

      cases.push({
        name,
        ...(fileAttr.length > 0 ? { file: fileAttr } : {}),
        colour,
      });
    }
  }

  return { ok: true, cases };
};

const collectCandidateFiles = (paths: string[]): string[] => {
  const files: string[] = [];

  const walk = (target: string): void => {
    const abs = path.resolve(target);
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
      files.push(abs);
      return;
    }
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (IGNORED_DIRS.has(entry.name)) continue;
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

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsToken = (haystack: string, needle: string): boolean => {
  if (needle.length === 0) return false;
  const pattern = new RegExp(
    `(?<![A-Za-z0-9_-])${escapeRegExp(needle)}(?![A-Za-z0-9_-])`,
  );
  return pattern.test(haystack);
};

const resolveTestFile = (
  caseDir: string,
  tc: JUnitTestCase,
  rowId: string,
  candidateFiles: string[],
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
    if (cached !== undefined) return cached;
    const text = fs.readFileSync(filePath, "utf8");
    fileContentCache.set(filePath, text);
    return text;
  };

  let matches = candidateFiles.filter((f) =>
    containsToken(readCached(f), tc.name),
  );
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

const cmdResults = (
  caseArg: string,
  junitArgs: string[],
  testPaths: string[],
  sliceFilter: string | undefined,
): number => {
  const caseDir = path.resolve(caseArg);
  const confRes = readJsonFile(
    path.join(caseDir, "oracle.conf.json"),
    OracleConfSchema,
    "oracle.conf.json",
  );
  if (!confRes.ok) {
    console.error(`results: ${confRes.error}`);
    return 2;
  }
  const conf = confRes.data;

  const filesRes = loadOracleFiles(caseDir);
  if (!filesRes.ok) {
    for (const err of filesRes.errors) {
      console.error(`results: ${err}`);
    }
    return 1;
  }

  const lockRes = checkLock(caseDir, conf, filesRes.files);
  if (!lockRes.ok) {
    for (const err of lockRes.errors) {
      console.error(`results: ${err}`);
    }
    return 1;
  }

  const scopedFiles =
    sliceFilter !== undefined
      ? filesRes.files.filter((f) => f.data.slice === sliceFilter)
      : filesRes.files;

  if (sliceFilter !== undefined && scopedFiles.length === 0) {
    console.error(`results: slice "${sliceFilter}" not found in ${caseDir}`);
    return 2;
  }

  const junitRes = parseJUnitFiles(junitArgs);
  if (!junitRes.ok) {
    console.error(`results: ${junitRes.error}`);
    return 2;
  }

  const candidateFiles = collectCandidateFiles(testPaths);
  const fileContentCache = new Map<string, string>();
  const fileHashCache = new Map<string, string>();

  const scopedRows: Array<{ slice: string; row: OracleRow }> = [];
  const normToRow = new Map<string, { slice: string; row: OracleRow }>();
  for (const file of scopedFiles) {
    for (const row of file.data.rows) {
      scopedRows.push({ slice: file.data.slice, row });
      normToRow.set(normaliseId(row.id), { slice: file.data.slice, row });
    }
  }

  const matched = new Map<string, RunRowState>();
  for (const tc of junitRes.cases) {
    const entry = normToRow.get(normaliseId(tc.name));
    if (!entry) continue;

    if (matched.has(entry.row.id)) {
      console.error(
        `results: duplicate JUnit testcase for row "${entry.row.id}" (test "${tc.name}")`,
      );
      return 2;
    }

    const resolved = resolveTestFile(
      caseDir,
      tc,
      entry.row.id,
      candidateFiles,
      fileContentCache,
    );
    if (!resolved.ok) {
      console.error(`results: ${resolved.error}`);
      return 2;
    }

    const absTestFile = resolved.absPath;
    let content = fileContentCache.get(absTestFile);
    if (content === undefined) {
      content = fs.readFileSync(absTestFile, "utf8");
      fileContentCache.set(absTestFile, content);
    }
    let fileHash = fileHashCache.get(absTestFile);
    if (fileHash === undefined) {
      fileHash = sha256File(absTestFile);
      fileHashCache.set(absTestFile, fileHash);
    }

    const allowKeyboard =
      "allowKeyboard" in entry.row ? entry.row.allowKeyboard === true : false;
    const lintFindings = lintTestFile(absTestFile, content, {
      kind: conf.kind,
      allowKeyboard,
      testName: tc.name,
    }).map(formatLintFinding);

    matched.set(entry.row.id, {
      slice: entry.slice,
      colour: tc.colour,
      testName: tc.name,
      testFile: path.relative(caseDir, absTestFile),
      fileHash,
      lintFindings,
      claimed: false,
    });
  }

  const runStatePath = path.join(caseDir, "run-state.json");
  let existingRows: Record<string, RunRowState> = {};
  if (fs.existsSync(runStatePath)) {
    const prev = readJsonFile(runStatePath, RunStateSchema, "run-state.json");
    if (prev.ok) {
      existingRows = prev.data.rows;
    }
  }

  const scopedIdSet = new Set(scopedRows.map((s) => s.row.id));
  const mergedRows: Record<string, RunRowState> = {};

  for (const [id, state] of Object.entries(existingRows)) {
    if (!scopedIdSet.has(id)) {
      mergedRows[id] = state;
    }
  }
  for (const [id, state] of matched.entries()) {
    mergedRows[id] = state;
  }

  const nextRunState: RunState = {
    updatedAt: new Date().toISOString(),
    rows: mergedRows,
  };
  fs.writeFileSync(
    runStatePath,
    `${JSON.stringify(nextRunState, null, 2)}\n`,
    "utf8",
  );

  const failures: string[] = [];
  for (const { row } of scopedRows) {
    if (row.status !== "active" && row.status !== "shortfall") continue;
    const result = matched.get(row.id);
    if (!result) {
      failures.push(`[${row.id}] (${row.status}): missing from JUnit results`);
      continue;
    }
    const expectedColour: RunColour = row.status === "active" ? "green" : "red";
    if (result.colour !== expectedColour) {
      failures.push(
        `[${row.id}] (${row.status}): expected ${expectedColour}, got ${result.colour}`,
      );
    }
    for (const finding of result.lintFindings) {
      failures.push(`[${row.id}] cheat-lint: ${finding}`);
    }
  }

  if (failures.length > 0) {
    for (const f of failures) {
      console.error(`results: ${f}`);
    }
    return 1;
  }

  console.log(`Results recorded: ${matched.size} matched row(s) passed`);
  return 0;
};

const cmdVerify = (caseArg: string, claimsArg: string): number => {
  const caseDir = path.resolve(caseArg);
  const confRes = readJsonFile(
    path.join(caseDir, "oracle.conf.json"),
    OracleConfSchema,
    "oracle.conf.json",
  );
  if (!confRes.ok) {
    console.error(`verify: ${confRes.error}`);
    return 1;
  }

  const filesRes = loadOracleFiles(caseDir);
  if (!filesRes.ok) {
    for (const err of filesRes.errors) {
      console.error(`verify: ${err}`);
    }
    return 1;
  }

  const lockRes = checkLock(caseDir, confRes.data, filesRes.files);
  if (!lockRes.ok) {
    for (const err of lockRes.errors) {
      console.error(`verify: ${err}`);
    }
    return 1;
  }

  const runStatePath = path.join(caseDir, "run-state.json");
  const runStateRes = readJsonFile(runStatePath, RunStateSchema, "run-state.json");
  if (!runStateRes.ok) {
    console.error(`verify: ${runStateRes.error}`);
    return 1;
  }

  const claimsRes = readYamlFile(
    path.resolve(claimsArg),
    ClaimsFileSchema,
    path.basename(claimsArg),
  );
  if (!claimsRes.ok) {
    console.error(`verify: ${claimsRes.error}`);
    return 1;
  }

  const claimById = new Map<string, string>();
  for (const c of claimsRes.data.claims) {
    claimById.set(c.id, c.redCondition);
  }

  const updatedRows: Record<string, RunRowState> = { ...runStateRes.data.rows };
  const clearClaim = (rowId: string): void => {
    const existing = updatedRows[rowId];
    if (!existing) return;
    const { redCondition: _rc, verifiedFileHash: _vh, ...rest } = existing;
    updatedRows[rowId] = { ...rest, claimed: false };
  };
  const failures: string[] = [];

  for (const file of filesRes.files) {
    for (const row of file.data.rows) {
      if (row.status !== "active" && row.status !== "shortfall") continue;

      const redCondition = claimById.get(row.id);
      if (redCondition === undefined || redCondition.trim().length === 0) {
        clearClaim(row.id);
        failures.push(`[${row.id}]: missing claim with non-empty redCondition`);
        continue;
      }

      const runRow = updatedRows[row.id];
      if (!runRow) {
        failures.push(`[${row.id}]: not present in run-state.json`);
        continue;
      }

      const expectedColour: RunColour = row.status === "active" ? "green" : "red";
      if (runRow.colour !== expectedColour) {
        clearClaim(row.id);
        failures.push(
          `[${row.id}] (${row.status}): expected ${expectedColour}, got ${runRow.colour}`,
        );
        continue;
      }

      if (runRow.lintFindings.length > 0) {
        clearClaim(row.id);
        failures.push(
          `[${row.id}]: has ${runRow.lintFindings.length} cheat-lint finding(s)`,
        );
        continue;
      }

      const absTestFile = path.resolve(caseDir, runRow.testFile);
      if (!fs.existsSync(absTestFile)) {
        clearClaim(row.id);
        failures.push(`[${row.id}]: test file missing on disk: ${absTestFile}`);
        continue;
      }

      const diskHash = sha256File(absTestFile);
      if (diskHash !== runRow.fileHash) {
        clearClaim(row.id);
        failures.push(
          `[${row.id}]: test file changed on disk since results (${runRow.testFile})`,
        );
        continue;
      }

      updatedRows[row.id] = {
        ...runRow,
        claimed: true,
        redCondition,
        verifiedFileHash: diskHash,
      };
    }
  }

  const nextRunState: RunState = {
    updatedAt: new Date().toISOString(),
    rows: updatedRows,
  };
  fs.writeFileSync(
    runStatePath,
    `${JSON.stringify(nextRunState, null, 2)}\n`,
    "utf8",
  );

  if (failures.length > 0) {
    for (const f of failures) {
      console.error(`verify: ${f}`);
    }
    return 1;
  }

  console.log("Verified all active and shortfall rows");
  return 0;
};

const cmdOpen = (caseArg: string): number => {
  const caseDir = path.resolve(caseArg);
  const confRes = readJsonFile(
    path.join(caseDir, "oracle.conf.json"),
    OracleConfSchema,
    "oracle.conf.json",
  );
  if (!confRes.ok) {
    console.error(`open: ${confRes.error}`);
    return 1;
  }

  const filesRes = loadOracleFiles(caseDir);
  if (!filesRes.ok) {
    for (const err of filesRes.errors) {
      console.error(`open: ${err}`);
    }
    return 1;
  }

  const counts = {
    active: 0,
    shortfall: 0,
    "cant-happen": 0,
    "other-level": 0,
    struck: 0,
  };
  const todayRows: string[] = [];
  const unresolvedGone: string[] = [];
  const liveUnplaced: string[] = [];

  for (const file of filesRes.files) {
    for (const row of file.data.rows) {
      counts[row.status] += 1;
      if (row.source === "today") {
        todayRows.push(`${file.data.slice}:${row.id}`);
      }
      if (row.gone === true && row.status !== "struck") {
        unresolvedGone.push(`${file.data.slice}:${row.id}`);
      }
    }
    for (const u of file.data.unplaced ?? []) {
      if (u.struck !== true && u.gone !== true) {
        liveUnplaced.push(`${file.data.slice}:${u.id} (${u.reason})`);
      }
    }
  }

  const totalRows =
    counts.active +
    counts.shortfall +
    counts["cant-happen"] +
    counts["other-level"] +
    counts.struck;

  console.log(
    `Rows (${totalRows}): active=${counts.active} shortfall=${counts.shortfall} cant-happen=${counts["cant-happen"]} other-level=${counts["other-level"]} struck=${counts.struck}`,
  );

  if (todayRows.length > 0) {
    console.log(`Today (${todayRows.length}): ${todayRows.join(", ")}`);
  }

  const lockRes = checkLock(caseDir, confRes.data, filesRes.files);
  if (!lockRes.ok) {
    console.log("Lock issues:");
    for (const err of lockRes.errors) {
      console.log(`  - ${err}`);
    }
  }

  if (unresolvedGone.length > 0) {
    console.log(`Unresolved gone (${unresolvedGone.length}): ${unresolvedGone.join(", ")}`);
  }

  if (liveUnplaced.length > 0) {
    console.log(`Live unplaced (${liveUnplaced.length}):`);
    for (const item of liveUnplaced) {
      console.log(`  - ${item}`);
    }
  }

  const runStateRes = readJsonFile(
    path.join(caseDir, "run-state.json"),
    RunStateSchema,
    "run-state.json",
  );
  const runRows = runStateRes.ok ? runStateRes.data.rows : {};

  const openItems: string[] = [];
  for (const file of filesRes.files) {
    for (const row of file.data.rows) {
      if (row.status !== "active" && row.status !== "shortfall") continue;
      const runRow = runRows[row.id];
      if (!runRow) {
        openItems.push(`${file.data.slice}:${row.id} (${row.status}): not run`);
        continue;
      }
      const expectedColour: RunColour = row.status === "active" ? "green" : "red";
      if (runRow.colour !== expectedColour) {
        openItems.push(
          `${file.data.slice}:${row.id} (${row.status}): expected ${expectedColour}, got ${runRow.colour}`,
        );
        continue;
      }
      if (runRow.lintFindings.length > 0) {
        openItems.push(
          `${file.data.slice}:${row.id} (${row.status}): ${runRow.lintFindings.length} cheat-lint finding(s)`,
        );
        continue;
      }
      if (!runRow.claimed) {
        openItems.push(`${file.data.slice}:${row.id} (${row.status}): unclaimed`);
        continue;
      }
      if (!runRow.verifiedFileHash) {
        openItems.push(
          `${file.data.slice}:${row.id} (${row.status}): missing verifiedFileHash`,
        );
        continue;
      }
      const absTestFile = path.resolve(caseDir, runRow.testFile);
      if (!fs.existsSync(absTestFile)) {
        openItems.push(
          `${file.data.slice}:${row.id} (${row.status}): test file missing on disk`,
        );
        continue;
      }
      const currentHash = sha256File(absTestFile);
      if (currentHash !== runRow.verifiedFileHash) {
        openItems.push(
          `${file.data.slice}:${row.id} (${row.status}): test file changed after verify`,
        );
      }
    }
  }

  if (openItems.length > 0) {
    console.log(`Open (${openItems.length}):`);
    for (const item of openItems) {
      console.log(`  - ${item}`);
    }
  }

  const closed =
    totalRows > 0 &&
    lockRes.ok &&
    unresolvedGone.length === 0 &&
    openItems.length === 0;

  return closed ? 0 : 1;
};

const cmdSchema = (outPath: string | undefined): number => {
  const jsonSchema = z.toJSONSchema(OracleFileSchema);
  const text = `${JSON.stringify(jsonSchema, null, 2)}\n`;
  if (outPath !== undefined) {
    const abs = path.resolve(outPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, text, "utf8");
  } else {
    process.stdout.write(text);
  }
  return 0;
};

const program = new Command();
program.name("ledger").description("Oracle ledger CLI for /oracle");

program
  .command("freeze")
  .description("Freeze oracle.conf.json and the row script hash into frozen.json")
  .argument("<case>", "Path to the __oracle__ case directory")
  .requiredOption("--words <words>", "Scope words describing this oracle case")
  .action((caseArg: string, opts: { words: string }) => {
    process.exitCode = cmdFreeze(caseArg, opts.words);
  });

program
  .command("rows")
  .description("Run the row script and sync <slice>.oracle.yaml files")
  .argument("<case>", "Path to the __oracle__ case directory")
  .option("--draft", "Allow running before freeze or with drifted script", false)
  .action((caseArg: string, opts: { draft: boolean }) => {
    process.exitCode = cmdRows(caseArg, opts.draft);
  });

program
  .command("validate")
  .description("Validate oracle.conf.json and every *.oracle.yaml file")
  .argument("<case>", "Path to the __oracle__ case directory")
  .action((caseArg: string) => {
    process.exitCode = cmdValidate(caseArg);
  });

program
  .command("lock")
  .description("Validate and write SHA-256 row hashes to locked.json")
  .argument("<case>", "Path to the __oracle__ case directory")
  .action((caseArg: string) => {
    process.exitCode = cmdLock(caseArg);
  });

program
  .command("results")
  .description("Ingest JUnit XML results, cheat-lint tests, and update run-state.json")
  .argument("<case>", "Path to the __oracle__ case directory")
  .argument("<junit...>", "One or more JUnit XML report files")
  .requiredOption("--tests <paths...>", "Test files or directories to resolve and lint")
  .option("--slice <slice>", "Limit result ingestion and checks to one slice")
  .action(
    (
      caseArg: string,
      junitArgs: string[],
      opts: { tests: string[]; slice?: string },
    ) => {
      process.exitCode = cmdResults(caseArg, junitArgs, opts.tests, opts.slice);
    },
  );

program
  .command("verify")
  .description("Validate claims.yaml against locked rows and bind test file hashes")
  .argument("<case>", "Path to the __oracle__ case directory")
  .argument("<claims>", "Path to claims.yaml")
  .action((caseArg: string, claimsArg: string) => {
    process.exitCode = cmdVerify(caseArg, claimsArg);
  });

program
  .command("open")
  .description("Report oracle status and exit 0 only when the case is fully closed")
  .argument("<case>", "Path to the __oracle__ case directory")
  .action((caseArg: string) => {
    process.exitCode = cmdOpen(caseArg);
  });

program
  .command("schema")
  .description("Emit JSON Schema for <slice>.oracle.yaml")
  .option("--out <path>", "Write schema to a file instead of stdout")
  .action((opts: { out?: string }) => {
    process.exitCode = cmdSchema(opts.out);
  });

program.parse(process.argv);
