import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  loadOracleFiles,
  readJsonFile,
  resolveRowScript,
  sha256File,
  writeJsonAtomic,
  writeYamlAtomic,
} from "../io.ts";
import { type DiscoveredRow, type DiscoveredUnplaced, mergeSliceFiles } from "../merge.ts";
import { formatZodError, FrozenSchema, OracleConfSchema, RowScriptLineSchema } from "../schema.ts";

export const cmdFreeze = (caseArg: string, words: string): number => {
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

  writeJsonAtomic(path.join(caseDir, "frozen.json"), frozen);
  console.log(`Frozen ${script.token} (${frozen.script.sha256.slice(0, 12)})`);
  return 0;
};

export const cmdRows = (caseArg: string, draft: boolean): number => {
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
    const frozenRes = readJsonFile(path.join(caseDir, "frozen.json"), FrozenSchema, "frozen.json");
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
    if (line.length === 0) {
      continue;
    }
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

  const existingFilesRes = loadOracleFiles(caseDir);
  if (!existingFilesRes.ok) {
    for (const err of existingFilesRes.errors) {
      console.error(`rows: ${err}`);
    }
    return 2;
  }

  const merged = mergeSliceFiles(conf, existingFilesRes.files, discoveredRows, discoveredUnplaced);
  if (!merged.ok) {
    for (const err of merged.errors) {
      console.error(`rows: ${err}`);
    }
    return 2;
  }

  for (const doc of merged.slices) {
    const outPath = path.join(caseDir, `${doc.slice}.oracle.yaml`);
    writeYamlAtomic(outPath, doc);
  }

  console.log(
    `Synced ${merged.rowCount} rows and ${merged.unplacedCount} unplaced items across ${merged.slices.length} slice(s)`,
  );
  return 0;
};
