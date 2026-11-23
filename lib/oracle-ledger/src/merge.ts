import {
  normaliseId,
  rowLockHash,
  validateOracleFile,
  type BrowserRow,
  type LoadedOracleFile,
  type Locked,
  type OracleConf,
  type OracleFile,
  type OracleRow,
  type RunColour,
  type RunRowState,
  type SimpleRow,
  type UnplacedItem,
} from "./schema.ts";

export type DiscoveredRow = {
  id: string;
  slice: string;
  where?: string;
  meta?: Record<string, string>;
  when?: string;
};

export type DiscoveredUnplaced = {
  id: string;
  slice: string;
  reason: string;
  where?: string;
};

export type MergeSliceFilesResult =
  | {
      ok: true;
      slices: OracleFile[];
      rowCount: number;
      unplacedCount: number;
    }
  | {
      ok: false;
      errors: string[];
    };

export type StatusCounts = {
  active: number;
  shortfall: number;
  "cant-happen": number;
  "other-level": number;
  struck: number;
};

export type OpenState = {
  counts: StatusCounts;
  totalRows: number;
  todayRows: string[];
  unresolvedGone: string[];
  liveUnplaced: string[];
  openItems: string[];
  closed: boolean;
};

const mergeBrowserRow = (stub: DiscoveredRow, existing: OracleRow | undefined): BrowserRow => {
  if (existing !== undefined) {
    const expectVal =
      existing.expect !== null && typeof existing.expect !== "string" ? existing.expect : null;
    const allowKeyboard = "allowKeyboard" in existing ? existing.allowKeyboard : undefined;
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

const mergeSimpleRow = (stub: DiscoveredRow, existing: OracleRow | undefined): SimpleRow => {
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

export const mergeSliceFiles = (
  conf: OracleConf,
  existingFiles: readonly LoadedOracleFile[],
  discoveredRows: readonly DiscoveredRow[],
  discoveredUnplaced: readonly DiscoveredUnplaced[],
): MergeSliceFilesResult => {
  const allDiscoveredRows: DiscoveredRow[] = [...discoveredRows];
  if (conf.uiStates !== undefined) {
    for (const uiState of conf.uiStates) {
      allDiscoveredRows.push({
        id: uiState.id,
        slice: uiState.slice ?? "all",
        when: uiState.when,
      });
    }
  }

  const errors: string[] = [];
  const normToId = new Map<string, string>();
  for (const row of allDiscoveredRows) {
    const norm = normaliseId(row.id);
    if (norm.length === 0) {
      errors.push(`row "${row.id}" normalises to an empty ID`);
      continue;
    }
    const prev = normToId.get(norm);
    if (prev !== undefined) {
      errors.push(`normalised-ID collision between "${prev}" and "${row.id}"`);
      continue;
    }
    normToId.set(norm, row.id);
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const existingById = new Map<string, OracleRow>();
  const existingBySlice = new Map<string, OracleFile>();
  for (const file of existingFiles) {
    existingBySlice.set(file.data.slice, file.data);
    for (const row of file.data.rows) {
      existingById.set(row.id, row);
    }
  }

  const allDiscoveredRowIds = new Set(allDiscoveredRows.map((r) => r.id));
  const sliceNames = new Set<string>([
    ...existingBySlice.keys(),
    ...allDiscoveredRows.map((r) => r.slice),
    ...discoveredUnplaced.map((u) => u.slice),
  ]);

  const slices: OracleFile[] = [];

  for (const slice of [...sliceNames].sort()) {
    const existingFile = existingBySlice.get(slice);
    const sliceStubs = allDiscoveredRows.filter((r) => r.slice === slice);
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
      slices.push({
        kind: "browser",
        slice,
        rows,
        ...(mergedUnplaced.length > 0 ? { unplaced: mergedUnplaced } : {}),
      });
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
      slices.push({
        kind: conf.kind,
        slice,
        rows,
        ...(mergedUnplaced.length > 0 ? { unplaced: mergedUnplaced } : {}),
      });
    }
  }

  return {
    ok: true,
    slices,
    rowCount: allDiscoveredRows.length,
    unplacedCount: discoveredUnplaced.length,
  };
};

export const checkLockState = (
  conf: OracleConf,
  files: readonly LoadedOracleFile[],
  locked: Locked,
): { ok: true; locked: Locked } | { ok: false; errors: string[] } => {
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
          errors.push(`row "${row.id}" in ${file.fileName} drifted from locked.json`);
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

export const validateLoadedCase = (
  conf: OracleConf,
  files: readonly LoadedOracleFile[],
): { ok: true } | { ok: false; errors: string[] } => {
  if (files.length === 0) {
    return { ok: false, errors: ["No *.oracle.yaml files found"] };
  }

  const errors: string[] = [];
  const normToId = new Map<string, string>();

  for (const file of files) {
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
          errors.push(`${file.fileName} [${row.id}]: normalised-ID collision with "${existing}"`);
        } else {
          normToId.set(norm, row.id);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
};

export const evaluateOpenState = (
  files: readonly LoadedOracleFile[],
  lockErrors: readonly string[],
  runRows: Readonly<Record<string, RunRowState>>,
  diskHashes: Readonly<Record<string, string | null>>,
): OpenState => {
  const counts: StatusCounts = {
    active: 0,
    shortfall: 0,
    "cant-happen": 0,
    "other-level": 0,
    struck: 0,
  };
  const todayRows: string[] = [];
  const unresolvedGone: string[] = [];
  const liveUnplaced: string[] = [];

  for (const file of files) {
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

  const openItems: string[] = [];
  for (const file of files) {
    for (const row of file.data.rows) {
      if (row.status !== "active" && row.status !== "shortfall") {
        continue;
      }
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
        openItems.push(`${file.data.slice}:${row.id} (${row.status}): missing verifiedFileHash`);
        continue;
      }
      const currentHash = diskHashes[runRow.testFile] ?? null;
      if (currentHash === null) {
        openItems.push(`${file.data.slice}:${row.id} (${row.status}): test file missing on disk`);
        continue;
      }
      if (currentHash !== runRow.verifiedFileHash) {
        openItems.push(
          `${file.data.slice}:${row.id} (${row.status}): test file changed after verify`,
        );
      }
    }
  }

  const closed =
    totalRows > 0 &&
    lockErrors.length === 0 &&
    unresolvedGone.length === 0 &&
    openItems.length === 0;

  return {
    counts,
    totalRows,
    todayRows,
    unresolvedGone,
    liveUnplaced,
    openItems,
    closed,
  };
};
