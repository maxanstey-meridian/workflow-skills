import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { containsToken, parseJUnitXml } from "../src/junit.ts";
import {
  checkLockState,
  evaluateOpenState,
  mergeSliceFiles,
  validateLoadedCase,
} from "../src/merge.ts";
import {
  rowLockHash,
  type BrowserRow,
  type LoadedOracleFile,
  type Locked,
  type OracleConf,
  type OracleFile,
  type RunRowState,
  type SimpleRow,
} from "../src/schema.ts";

const loadedFile = (
  data: OracleFile,
  fileName = `${data.slice}.oracle.yaml`,
): LoadedOracleFile => ({
  fileName,
  filePath: `/case/${fileName}`,
  data,
});

const makeSimpleRow = (overrides: Partial<SimpleRow> = {}): SimpleRow => ({
  id: "row_a",
  status: "active",
  when: "Valid input",
  expect: "Exits 0",
  source: "written",
  shortfall: null,
  reason: null,
  question: null,
  ...overrides,
});

const makeBrowserRow = (overrides: Partial<BrowserRow> = {}): BrowserRow => ({
  id: "save_ok",
  status: "active",
  when: "User submits form",
  expect: { ui: "Saved toast" },
  source: "written",
  shortfall: null,
  reason: null,
  question: null,
  ...overrides,
});

const makeRunRow = (overrides: Partial<RunRowState> = {}): RunRowState => ({
  slice: "core",
  colour: "green",
  testName: "row_a",
  testFile: "test/core.test.ts",
  fileHash: "hash-v1",
  lintFindings: [],
  claimed: true,
  redCondition: "Break return value",
  verifiedFileHash: "hash-v1",
  ...overrides,
});

describe("parseJUnitXml", () => {
  it("parses green, red, skipped, and error testcases and inherits ancestor @file", () => {
    const xml = [
      '<?xml version="1.0" encoding="utf-8"?>',
      "<testsuites>",
      '  <testsuite name="suite" file="test/inherited.test.ts">',
      '    <testcase name="pass_own_file" file="test/own.test.ts"/>',
      '    <testcase name="fail_inherited"><failure message="nope"/></testcase>',
      '    <testcase name="skip_case"><skipped/></testcase>',
      '    <testcase name="error_case"><error message="boom"/></testcase>',
      "  </testsuite>",
      '  <testsuite name="no_file_suite">',
      '    <testcase name="bare_pass"/>',
      "  </testsuite>",
      "</testsuites>",
    ].join("\n");

    assert.deepEqual(parseJUnitXml(xml), [
      { name: "pass_own_file", file: "test/own.test.ts", colour: "green" },
      { name: "fail_inherited", file: "test/inherited.test.ts", colour: "red" },
      { name: "skip_case", file: "test/inherited.test.ts", colour: "skipped" },
      { name: "error_case", file: "test/inherited.test.ts", colour: "error" },
      { name: "bare_pass", colour: "green" },
    ]);
  });
});

describe("containsToken", () => {
  it("matches whole tokens and rejects prefix/suffix overlaps", () => {
    assert.equal(containsToken('test("create_user", () => {});', "create_user"), true);
    assert.equal(containsToken('test("create_user_admin", () => {});', "create_user"), false);
    assert.equal(containsToken('test("my_create_user", () => {});', "create_user"), false);
    assert.equal(containsToken('test("create-user-2", () => {});', "create-user"), false);
    assert.equal(containsToken("anything", ""), false);
    assert.equal(containsToken('it("a.b+c", () => {})', "a.b+c"), true);
    assert.equal(containsToken('it("axb+c", () => {})', "a.b+c"), false);
  });
});

describe("mergeSliceFiles", () => {
  it("preserves human fields, marks vanished rows and unplaced gone, appends uiStates, and sorts slices", () => {
    const conf: OracleConf = {
      kind: "browser",
      rows: ["node", "rows.ts"],
      uiStates: [
        { id: "empty_banner", slice: "alpha", when: "Zero rows exist" },
        { id: "global_banner", when: "Maintenance mode" },
      ],
    };

    const existing: LoadedOracleFile[] = [
      loadedFile({
        kind: "browser",
        slice: "beta",
        rows: [
          makeBrowserRow({
            id: "save_ok",
            where: "Old.vue:1",
            expect: { ui: "Saved toast", api: "200 OK" },
            source: "ruling",
            sourceRef: "PR#12",
            allowKeyboard: true,
          }),
          makeBrowserRow({ id: "vanished_row", where: "Gone.vue:5" }),
        ],
        unplaced: [
          { id: "kept_unplaced", reason: "old reason", struck: true },
          { id: "vanished_unplaced", reason: "dynamic route", where: "app.ts:4" },
        ],
      }),
    ];

    const discoveredRows = [
      { id: "save_ok", slice: "beta", where: "New.vue:9", meta: { route: "/save" } },
      { id: "new_row", slice: "alpha" },
    ];
    const discoveredUnplaced = [
      { id: "kept_unplaced", slice: "beta", reason: "new reason", where: "app.ts:9" },
    ];

    const res = mergeSliceFiles(conf, existing, discoveredRows, discoveredUnplaced);
    assert.equal(res.ok, true);
    if (!res.ok) {
      return;
    }

    assert.equal(res.rowCount, 4);
    assert.equal(res.unplacedCount, 1);
    assert.deepEqual(
      res.slices.map((s) => s.slice),
      ["all", "alpha", "beta"],
    );

    const all = res.slices[0];
    const alpha = res.slices[1];
    const beta = res.slices[2];
    assert.ok(all && all.kind === "browser");
    assert.ok(alpha && alpha.kind === "browser");
    assert.ok(beta && beta.kind === "browser");

    assert.equal("unplaced" in all, false);
    assert.equal("unplaced" in alpha, false);

    assert.deepEqual(all.rows, [
      {
        id: "global_banner",
        status: "active",
        when: "Maintenance mode",
        expect: null,
        source: null,
        shortfall: null,
        reason: null,
        question: null,
      },
    ]);

    assert.deepEqual(alpha.rows, [
      {
        id: "new_row",
        status: "active",
        when: null,
        expect: null,
        source: null,
        shortfall: null,
        reason: null,
        question: null,
      },
      {
        id: "empty_banner",
        status: "active",
        when: "Zero rows exist",
        expect: null,
        source: null,
        shortfall: null,
        reason: null,
        question: null,
      },
    ]);

    const saveOk = beta.rows.find((r) => r.id === "save_ok");
    const vanished = beta.rows.find((r) => r.id === "vanished_row");
    assert.deepEqual(saveOk, {
      id: "save_ok",
      where: "New.vue:9",
      meta: { route: "/save" },
      status: "active",
      when: "User submits form",
      expect: { ui: "Saved toast", api: "200 OK" },
      source: "ruling",
      sourceRef: "PR#12",
      shortfall: null,
      reason: null,
      question: null,
      allowKeyboard: true,
    });
    assert.equal(vanished?.gone, true);

    assert.deepEqual(beta.unplaced, [
      { id: "kept_unplaced", reason: "new reason", where: "app.ts:9", struck: true },
      { id: "vanished_unplaced", reason: "dynamic route", where: "app.ts:4", gone: true },
    ]);
  });

  it("merges simple cli rows and marks vanished rows gone", () => {
    const conf: OracleConf = { kind: "cli", rows: ["node", "rows.ts"] };
    const existing = [
      loadedFile({
        kind: "cli",
        slice: "core",
        rows: [
          makeSimpleRow({
            id: "keep_me",
            where: "old.ts:1",
            status: "shortfall",
            when: "Custom when",
            expect: "Custom expect",
            source: "ruling",
            sourceRef: "ADR-1",
            shortfall: "Bug",
            reason: "Note",
            question: { ask: "Q?", recommend: "A" },
          }),
          makeSimpleRow({ id: "drop_me" }),
        ],
      }),
    ];

    const res = mergeSliceFiles(
      conf,
      existing,
      [
        { id: "keep_me", slice: "core", where: "ticket.ts:1", meta: { group: "ops" } },
        { id: "brand_new", slice: "core" },
      ],
      [],
    );
    assert.equal(res.ok, true);
    if (!res.ok) {
      return;
    }

    const core = res.slices[0];
    assert.ok(core && core.kind === "cli");
    assert.equal("unplaced" in core, false);
    assert.deepEqual(
      core.rows.find((r) => r.id === "keep_me"),
      {
        id: "keep_me",
        where: "ticket.ts:1",
        meta: { group: "ops" },
        status: "shortfall",
        when: "Custom when",
        expect: "Custom expect",
        source: "ruling",
        sourceRef: "ADR-1",
        shortfall: "Bug",
        reason: "Note",
        question: { ask: "Q?", recommend: "A" },
      },
    );
    assert.deepEqual(
      core.rows.find((r) => r.id === "brand_new"),
      {
        id: "brand_new",
        status: "active",
        when: null,
        expect: null,
        source: null,
        shortfall: null,
        reason: null,
        question: null,
      },
    );
    assert.equal(core.rows.find((r) => r.id === "drop_me")?.gone, true);
  });

  it("returns errors on empty normalised ID or normalised-ID collision", () => {
    const conf: OracleConf = { kind: "cli", rows: ["node", "rows.ts"] };
    const res = mergeSliceFiles(
      conf,
      [],
      [
        { id: "---", slice: "core" },
        { id: "create-user", slice: "core" },
        { id: "Create_User", slice: "core" },
      ],
      [],
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.deepEqual(res.errors, [
        'row "---" normalises to an empty ID',
        'normalised-ID collision between "create-user" and "Create_User"',
      ]);
    }
  });
});

describe("checkLockState", () => {
  it("succeeds when kind and all row hashes match", () => {
    const conf: OracleConf = { kind: "cli", rows: ["node", "rows.ts"] };
    const row = makeSimpleRow({ id: "row_a" });
    const files = [loadedFile({ kind: "cli", slice: "core", rows: [row] })];
    const locked: Locked = {
      lockedAt: "2026-01-01T00:00:00Z",
      kind: "cli",
      rows: { row_a: rowLockHash(row) },
    };

    const res = checkLockState(conf, files, locked);
    assert.equal(res.ok, true);
  });

  it("reports kind mismatch, unlocked row, drifted row, and missing locked row", () => {
    const conf: OracleConf = { kind: "cli", rows: ["node", "rows.ts"] };
    const rowA = makeSimpleRow({ id: "row_a", expect: "Changed" });
    const rowB = makeSimpleRow({ id: "row_b" });
    const files = [loadedFile({ kind: "cli", slice: "core", rows: [rowA, rowB] })];
    const locked: Locked = {
      lockedAt: "2026-01-01T00:00:00Z",
      kind: "browser",
      rows: {
        row_a: rowLockHash(makeSimpleRow({ id: "row_a", expect: "Original" })),
        row_missing: "deadbeef",
      },
    };

    const res = checkLockState(conf, files, locked);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.deepEqual(res.errors, [
        'locked.json kind "browser" does not match oracle.conf.json kind "cli"',
        'row "row_a" in core.oracle.yaml drifted from locked.json',
        'row "row_b" in core.oracle.yaml is not locked',
        'locked row "row_missing" is missing from *.oracle.yaml',
      ]);
    }
  });
});

describe("validateLoadedCase", () => {
  it("passes on a clean multi-slice case and catches empty files, filename mismatch, empty ID, and collisions", () => {
    const conf: OracleConf = { kind: "cli", rows: ["node", "rows.ts"] };

    const emptyRes = validateLoadedCase(conf, []);
    assert.equal(emptyRes.ok, false);

    const validFiles = [
      loadedFile({ kind: "cli", slice: "a", rows: [makeSimpleRow({ id: "row_a" })] }),
      loadedFile({ kind: "cli", slice: "b", rows: [makeSimpleRow({ id: "row_b" })] }),
    ];
    assert.deepEqual(validateLoadedCase(conf, validFiles), { ok: true });

    const invalidFiles = [
      loadedFile(
        {
          kind: "cli",
          slice: "wrong_name",
          rows: [makeSimpleRow({ id: "row-one" }), makeSimpleRow({ id: "___", expect: "   " })],
        },
        "a.oracle.yaml",
      ),
      loadedFile(
        {
          kind: "cli",
          slice: "b",
          rows: [makeSimpleRow({ id: "Row_One" })],
        },
        "b.oracle.yaml",
      ),
    ];

    const res = validateLoadedCase(conf, invalidFiles);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.deepEqual(res.errors, [
        'a.oracle.yaml: slice "wrong_name" does not match filename "a"',
        "a.oracle.yaml [___]: cli active row requires non-empty expect",
        "a.oracle.yaml [___]: normalised ID is empty",
        'b.oracle.yaml [Row_One]: normalised-ID collision with "row-one"',
      ]);
    }
  });
});

describe("evaluateOpenState", () => {
  it("reports closed when all active/shortfall rows match expected colour, claims, and disk hashes", () => {
    const files = [
      loadedFile({
        kind: "cli",
        slice: "core",
        rows: [
          makeSimpleRow({ id: "r_active", source: "today" }),
          makeSimpleRow({ id: "r_shortfall", status: "shortfall", shortfall: "Bug" }),
          makeSimpleRow({ id: "r_cant", status: "cant-happen", reason: "Impossible" }),
          makeSimpleRow({ id: "r_other", status: "other-level", reason: "Unit tested" }),
          makeSimpleRow({ id: "r_struck", status: "struck", gone: true, reason: "Retired" }),
        ],
        unplaced: [
          { id: "u_live", reason: "Dynamic" },
          { id: "u_struck", reason: "Old", struck: true },
          { id: "u_gone", reason: "Removed", gone: true },
        ],
      }),
    ];

    const state = evaluateOpenState(
      files,
      [],
      {
        r_active: makeRunRow({ testName: "r_active", colour: "green" }),
        r_shortfall: makeRunRow({ testName: "r_shortfall", colour: "red" }),
      },
      { "test/core.test.ts": "hash-v1" },
    );

    assert.deepEqual(state.counts, {
      active: 1,
      shortfall: 1,
      "cant-happen": 1,
      "other-level": 1,
      struck: 1,
    });
    assert.equal(state.totalRows, 5);
    assert.deepEqual(state.todayRows, ["core:r_active"]);
    assert.deepEqual(state.unresolvedGone, []);
    assert.deepEqual(state.liveUnplaced, ["core:u_live (Dynamic)"]);
    assert.deepEqual(state.openItems, []);
    assert.equal(state.closed, true);
  });

  it("reports every open condition and stays open when lock errors, gone rows, or empty rows exist", () => {
    const files = [
      loadedFile({
        kind: "cli",
        slice: "s",
        rows: [
          makeSimpleRow({ id: "not_run" }),
          makeSimpleRow({ id: "wrong_colour" }),
          makeSimpleRow({ id: "has_lint" }),
          makeSimpleRow({ id: "unclaimed" }),
          makeSimpleRow({ id: "no_verified_hash" }),
          makeSimpleRow({ id: "missing_file" }),
          makeSimpleRow({ id: "changed_file" }),
          makeSimpleRow({ id: "gone_active", gone: true }),
        ],
      }),
    ];

    const state = evaluateOpenState(
      files,
      ["row drifted"],
      {
        wrong_colour: makeRunRow({ slice: "s", testName: "wrong_colour", colour: "red" }),
        has_lint: makeRunRow({
          slice: "s",
          testName: "has_lint",
          lintFindings: ["a.ts:1: [no-skip] banned"],
        }),
        unclaimed: makeRunRow({ slice: "s", testName: "unclaimed", claimed: false }),
        no_verified_hash: makeRunRow({
          slice: "s",
          testName: "no_verified_hash",
          verifiedFileHash: undefined,
        }),
        missing_file: makeRunRow({
          slice: "s",
          testName: "missing_file",
          testFile: "test/missing.test.ts",
        }),
        changed_file: makeRunRow({
          slice: "s",
          testName: "changed_file",
          testFile: "test/changed.test.ts",
          verifiedFileHash: "hash-v1",
        }),
        gone_active: makeRunRow({ slice: "s", testName: "gone_active" }),
      },
      {
        "test/core.test.ts": "hash-v1",
        "test/missing.test.ts": null,
        "test/changed.test.ts": "hash-v2",
      },
    );

    assert.equal(state.closed, false);
    assert.deepEqual(state.unresolvedGone, ["s:gone_active"]);
    assert.deepEqual(state.openItems, [
      "s:not_run (active): not run",
      "s:wrong_colour (active): expected green, got red",
      "s:has_lint (active): 1 cheat-lint finding(s)",
      "s:unclaimed (active): unclaimed",
      "s:no_verified_hash (active): missing verifiedFileHash",
      "s:missing_file (active): test file missing on disk",
      "s:changed_file (active): test file changed after verify",
    ]);

    // Zero rows is never closed
    const emptyState = evaluateOpenState([], [], {}, {});
    assert.equal(emptyState.closed, false);

    // Each closed gate holds independently
    const cleanFiles = [
      loadedFile({ kind: "cli", slice: "core", rows: [makeSimpleRow({ id: "r_active" })] }),
    ];
    const cleanRunRows = { r_active: makeRunRow({ testName: "r_active", colour: "green" }) };
    const cleanDiskHashes = { "test/core.test.ts": "hash-v1" };

    const onlyLockErrors = evaluateOpenState(
      cleanFiles,
      ["row drifted"],
      cleanRunRows,
      cleanDiskHashes,
    );
    assert.deepEqual(onlyLockErrors.unresolvedGone, []);
    assert.deepEqual(onlyLockErrors.openItems, []);
    assert.equal(onlyLockErrors.closed, false);

    const onlyGoneFiles = [
      loadedFile({
        kind: "cli",
        slice: "core",
        rows: [makeSimpleRow({ id: "r_active", gone: true })],
      }),
    ];
    const onlyUnresolvedGone = evaluateOpenState(onlyGoneFiles, [], cleanRunRows, cleanDiskHashes);
    assert.deepEqual(onlyUnresolvedGone.unresolvedGone, ["core:r_active"]);
    assert.deepEqual(onlyUnresolvedGone.openItems, []);
    assert.equal(onlyUnresolvedGone.closed, false);

    const onlyOpenItems = evaluateOpenState(cleanFiles, [], {}, cleanDiskHashes);
    assert.deepEqual(onlyOpenItems.unresolvedGone, []);
    assert.deepEqual(onlyOpenItems.openItems, ["core:r_active (active): not run"]);
    assert.equal(onlyOpenItems.closed, false);
  });
});
