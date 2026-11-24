import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  collectCandidateFiles,
  loadOracleFiles,
  readJsonFile,
  readJUnitFiles,
  readTypedYamlFile,
  resolveTestFile,
  sha256File,
  writeJsonAtomic,
} from "../io.ts";
import { formatLintFinding, lintTestFile } from "../lint.ts";
import { checkLockState, evaluateOpenState } from "../merge.ts";
import {
  ClaimsFileSchema,
  type LoadedOracleFile,
  type Locked,
  LockedSchema,
  normaliseId,
  type OracleConf,
  OracleConfSchema,
  OracleFileSchema,
  type OracleRow,
  type RunColour,
  type RunRowState,
  type RunState,
  RunStateSchema,
} from "../schema.ts";

const sliceRunStatePath = (caseDir: string, slice: string): string =>
  path.join(caseDir, "run-state", `${slice}.json`);

const checkLockOnDisk = (
  caseDir: string,
  conf: OracleConf,
  files: readonly LoadedOracleFile[],
): { ok: true; locked: Locked } | { ok: false; errors: string[] } => {
  const lockedPath = path.join(caseDir, "locked.json");
  const loaded = readJsonFile(lockedPath, LockedSchema, "locked.json");
  if (!loaded.ok) {
    return { ok: false, errors: [loaded.error] };
  }
  return checkLockState(conf, files, loaded.data);
};

export const cmdResults = (
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

  const lockRes = checkLockOnDisk(caseDir, conf, filesRes.files);
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

  const junitRes = readJUnitFiles(junitArgs);
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
    if (!entry) {
      continue;
    }

    if (matched.has(entry.row.id)) {
      console.error(
        `results: duplicate JUnit testcase for row "${entry.row.id}" (test "${tc.name}")`,
      );
      return 2;
    }

    const resolved = resolveTestFile(caseDir, tc, entry.row.id, candidateFiles, fileContentCache);
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

    const allowKeyboard = "allowKeyboard" in entry.row ? entry.row.allowKeyboard === true : false;
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

  const now = new Date().toISOString();
  for (const file of scopedFiles) {
    const slice = file.data.slice;
    const sliceRows: Record<string, RunRowState> = {};
    for (const [id, state] of matched.entries()) {
      if (state.slice === slice) {
        sliceRows[id] = state;
      }
    }
    const nextRunState: RunState = {
      updatedAt: now,
      rows: sliceRows,
    };
    writeJsonAtomic(sliceRunStatePath(caseDir, slice), nextRunState);
  }

  const failures: string[] = [];
  for (const { row } of scopedRows) {
    if (row.status !== "active" && row.status !== "shortfall") {
      continue;
    }
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

export const cmdVerify = (caseArg: string, claimsArg: string, sliceFilter?: string): number => {
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

  const lockRes = checkLockOnDisk(caseDir, confRes.data, filesRes.files);
  if (!lockRes.ok) {
    for (const err of lockRes.errors) {
      console.error(`verify: ${err}`);
    }
    return 1;
  }

  const scopedFiles =
    sliceFilter !== undefined
      ? filesRes.files.filter((f) => f.data.slice === sliceFilter)
      : filesRes.files;

  if (sliceFilter !== undefined && scopedFiles.length === 0) {
    console.error(`verify: slice "${sliceFilter}" not found in ${caseDir}`);
    return 2;
  }

  const claimsRes = readTypedYamlFile(
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

  const failures: string[] = [];

  for (const file of scopedFiles) {
    const slice = file.data.slice;
    const expectedRows = file.data.rows.filter(
      (row) => row.status === "active" || row.status === "shortfall",
    );
    if (expectedRows.length === 0 && sliceFilter === undefined) {
      continue;
    }

    const statePath = sliceRunStatePath(caseDir, slice);
    const stateLabel = `run-state/${slice}.json`;
    const runStateRes = readJsonFile(statePath, RunStateSchema, stateLabel);
    if (!runStateRes.ok) {
      failures.push(runStateRes.error);
      continue;
    }

    const updatedRows: Record<string, RunRowState> = { ...runStateRes.data.rows };
    const clearClaim = (rowId: string): void => {
      const existing = updatedRows[rowId];
      if (!existing) {
        return;
      }
      updatedRows[rowId] = {
        slice: existing.slice,
        colour: existing.colour,
        testName: existing.testName,
        testFile: existing.testFile,
        fileHash: existing.fileHash,
        lintFindings: existing.lintFindings,
        claimed: false,
      };
    };

    for (const row of expectedRows) {
      const redCondition = claimById.get(row.id);
      if (redCondition === undefined || redCondition.trim().length === 0) {
        clearClaim(row.id);
        failures.push(`[${row.id}]: missing claim with non-empty redCondition`);
        continue;
      }

      const runRow = updatedRows[row.id];
      if (!runRow) {
        failures.push(`[${row.id}]: not present in ${stateLabel}`);
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
        failures.push(`[${row.id}]: has ${runRow.lintFindings.length} cheat-lint finding(s)`);
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
        failures.push(`[${row.id}]: test file changed on disk since results (${runRow.testFile})`);
        continue;
      }

      updatedRows[row.id] = {
        ...runRow,
        claimed: true,
        redCondition,
        verifiedFileHash: diskHash,
      };
    }

    const nextRunState: RunState = {
      updatedAt: new Date().toISOString(),
      rows: updatedRows,
    };
    writeJsonAtomic(statePath, nextRunState);
  }

  if (failures.length > 0) {
    for (const f of failures) {
      console.error(`verify: ${f}`);
    }
    return 1;
  }

  console.log(
    sliceFilter !== undefined
      ? `Verified all active and shortfall rows in slice "${sliceFilter}"`
      : "Verified all active and shortfall rows",
  );
  return 0;
};

export const cmdOpen = (caseArg: string): number => {
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

  const lockRes = checkLockOnDisk(caseDir, confRes.data, filesRes.files);
  const lockErrors = lockRes.ok ? [] : lockRes.errors;

  const runRows: Record<string, RunRowState> = {};
  for (const file of filesRes.files) {
    const slice = file.data.slice;
    const runStateRes = readJsonFile(
      sliceRunStatePath(caseDir, slice),
      RunStateSchema,
      `run-state/${slice}.json`,
    );
    if (runStateRes.ok) {
      for (const [id, rowState] of Object.entries(runStateRes.data.rows)) {
        runRows[id] = rowState;
      }
    }
  }

  const diskHashes: Record<string, string | null> = {};
  for (const runRow of Object.values(runRows)) {
    if (runRow.testFile in diskHashes) {
      continue;
    }
    const absTestFile = path.resolve(caseDir, runRow.testFile);
    diskHashes[runRow.testFile] = fs.existsSync(absTestFile) ? sha256File(absTestFile) : null;
  }

  const state = evaluateOpenState(filesRes.files, lockErrors, runRows, diskHashes);

  console.log(
    `Rows (${state.totalRows}): active=${state.counts.active} shortfall=${state.counts.shortfall} cant-happen=${state.counts["cant-happen"]} other-level=${state.counts["other-level"]} struck=${state.counts.struck}`,
  );

  if (state.todayRows.length > 0) {
    console.log(`Today (${state.todayRows.length}): ${state.todayRows.join(", ")}`);
  }

  if (lockErrors.length > 0) {
    console.log("Lock issues:");
    for (const err of lockErrors) {
      console.log(`  - ${err}`);
    }
  }

  if (state.unresolvedGone.length > 0) {
    console.log(
      `Unresolved gone (${state.unresolvedGone.length}): ${state.unresolvedGone.join(", ")}`,
    );
  }

  if (state.liveUnplaced.length > 0) {
    console.log(`Live unplaced (${state.liveUnplaced.length}):`);
    for (const item of state.liveUnplaced) {
      console.log(`  - ${item}`);
    }
  }

  if (state.openItems.length > 0) {
    console.log(`Open (${state.openItems.length}):`);
    for (const item of state.openItems) {
      console.log(`  - ${item}`);
    }
  }

  return state.closed ? 0 : 1;
};

export const cmdSchema = (outPath: string | undefined): number => {
  const jsonSchema = z.toJSONSchema(OracleFileSchema);
  if (outPath !== undefined) {
    writeJsonAtomic(path.resolve(outPath), jsonSchema);
  } else {
    process.stdout.write(`${JSON.stringify(jsonSchema, null, 2)}\n`);
  }
  return 0;
};
