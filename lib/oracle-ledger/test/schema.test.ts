import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatZodError,
  normaliseId,
  OracleConfSchema,
  rowLockHash,
  validateOracleFile,
  type BrowserRow,
  type OracleFile,
  type SimpleRow,
} from "../src/schema.ts";

const makeBrowserRow = (overrides: Partial<BrowserRow> = {}): BrowserRow => ({
  id: "save_form",
  status: "active",
  when: "User clicks Save",
  expect: { ui: "Saved banner appears" },
  source: "written",
  shortfall: null,
  reason: null,
  question: null,
  ...overrides,
});

const makeSimpleRow = (overrides: Partial<SimpleRow> = {}): SimpleRow => ({
  id: "open_pause",
  status: "active",
  when: "Open ticket is paused",
  expect: "Returns next=paused",
  source: "written",
  shortfall: null,
  reason: null,
  question: null,
  ...overrides,
});

describe("OracleConfSchema", () => {
  it("allows uiStates when kind is browser", () => {
    const parsed = OracleConfSchema.safeParse({
      kind: "browser",
      rows: ["node", "rows.ts"],
      uiStates: [{ id: "empty_list", slice: "list", when: "No records exist" }],
    });
    assert.equal(parsed.success, true);
  });

  it("rejects uiStates when kind is cli or api-contract", () => {
    for (const kind of ["cli", "api-contract"] as const) {
      const parsed = OracleConfSchema.safeParse({
        kind,
        rows: ["node", "rows.ts"],
        uiStates: [{ id: "empty_list", when: "No records exist" }],
      });
      assert.equal(parsed.success, false);
      if (!parsed.success) {
        assert.match(formatZodError(parsed.error), /uiStates: uiStates is only allowed/);
      }
    }
  });

  it("rejects empty rows command array", () => {
    const parsed = OracleConfSchema.safeParse({ kind: "cli", rows: [] });
    assert.equal(parsed.success, false);
  });
});

describe("formatZodError", () => {
  it("formats root and nested issue paths", () => {
    const rootErr = OracleConfSchema.safeParse("not-an-object");
    assert.equal(rootErr.success, false);
    if (!rootErr.success) {
      assert.match(formatZodError(rootErr.error), /^\(root\):/);
    }

    const nestedErr = OracleConfSchema.safeParse({
      kind: "browser",
      rows: ["node", "rows.ts"],
      uiStates: [{ id: "", when: "" }],
    });
    assert.equal(nestedErr.success, false);
    if (!nestedErr.success) {
      assert.match(formatZodError(nestedErr.error), /uiStates\.0\.id:/);
      assert.match(formatZodError(nestedErr.error), /uiStates\.0\.when:/);
    }
  });
});

describe("normaliseId", () => {
  it("lowercases and strips non-alphanumeric characters", () => {
    assert.equal(normaliseId("Create_User-123"), "createuser123");
    assert.equal(normaliseId("  POST /api/v1/items  "), "postapiv1items");
    assert.equal(normaliseId("---___"), "");
  });
});

describe("rowLockHash", () => {
  it("is deterministic and sensitive to locked fields only", () => {
    const base = makeBrowserRow({
      where: "Form.vue:10",
      meta: { route: "/forms" },
      source: "written",
      sourceRef: "spec.md",
    });
    const sameLockedFields = makeBrowserRow({
      where: "Form.vue:99",
      meta: { route: "/other" },
      source: "ruling",
      sourceRef: "ruling.md",
      reason: "note",
      gone: true,
    });

    const hashBase = rowLockHash(base);
    assert.match(hashBase, /^[a-f0-9]{64}$/);
    assert.equal(rowLockHash(sameLockedFields), hashBase);

    // Omitting allowKeyboard is canonicalised to false
    assert.equal(rowLockHash(makeBrowserRow({ allowKeyboard: false })), hashBase);

    // Changing any locked field changes the hash
    assert.notEqual(rowLockHash(makeBrowserRow({ when: "Different trigger" })), hashBase);
    assert.notEqual(rowLockHash(makeBrowserRow({ expect: { ui: "Different banner" } })), hashBase);
    assert.notEqual(
      rowLockHash(makeBrowserRow({ expect: { ui: "Saved banner appears", api: "200 OK" } })),
      hashBase,
    );
    assert.notEqual(rowLockHash(makeBrowserRow({ status: "shortfall" })), hashBase);
    assert.notEqual(rowLockHash(makeBrowserRow({ shortfall: "Known bug" })), hashBase);
    assert.notEqual(rowLockHash(makeBrowserRow({ allowKeyboard: true })), hashBase);
  });

  it("hashes simple rows and null expectations consistently", () => {
    const row = makeSimpleRow();
    const hash1 = rowLockHash(row);
    const hash2 = rowLockHash(makeSimpleRow({ expect: "Different output" }));
    const nullSimpleHash = rowLockHash(makeSimpleRow({ expect: null }));
    const nullBrowserHash = rowLockHash(makeBrowserRow({ expect: null }));
    assert.match(hash1, /^[a-f0-9]{64}$/);
    assert.match(nullSimpleHash, /^[a-f0-9]{64}$/);
    assert.match(nullBrowserHash, /^[a-f0-9]{64}$/);
    assert.notEqual(hash1, hash2);
    assert.notEqual(nullSimpleHash, hash1);
    assert.notEqual(nullBrowserHash, rowLockHash(makeBrowserRow()));
  });
});

describe("validateOracleFile", () => {
  it("reports kind mismatch against oracle.conf.json", () => {
    const file: OracleFile = { kind: "cli", slice: "s", rows: [] };
    const errors = validateOracleFile(file, "browser", "s.oracle.yaml");
    assert.deepEqual(errors, [
      's.oracle.yaml: kind "cli" does not match oracle.conf.json kind "browser"',
    ]);
  });

  it("validates browser active, question, shortfall, and non-active rows", () => {
    const validFile: OracleFile = {
      kind: "browser",
      slice: "page",
      rows: [
        makeBrowserRow({ id: "ok_active", expect: { ui: "Toast", api: "201 Created" } }),
        makeBrowserRow({
          id: "active_with_question",
          when: null,
          expect: null,
          source: null,
          question: { ask: "Should it redirect?", recommend: "Yes" },
        }),
        makeBrowserRow({
          id: "ok_shortfall",
          status: "shortfall",
          shortfall: "Button does not disable",
        }),
        makeBrowserRow({
          id: "ok_cant_happen",
          status: "cant-happen",
          when: null,
          expect: null,
          source: null,
          reason: "Guarded by route middleware",
        }),
        makeBrowserRow({
          id: "ok_other_level",
          status: "other-level",
          when: null,
          expect: null,
          source: null,
          reason: "Covered by unit test",
        }),
        makeBrowserRow({
          id: "ok_struck",
          status: "struck",
          when: null,
          expect: null,
          source: null,
          reason: "Retired",
        }),
      ],
    };
    assert.deepEqual(validateOracleFile(validFile, "browser", "page.oracle.yaml"), []);

    const invalidFile: OracleFile = {
      kind: "browser",
      slice: "page",
      rows: [
        makeBrowserRow({
          id: "bad_active",
          when: "   ",
          source: null,
          expect: { ui: "   " },
          shortfall: "unexpected",
        }),
        makeBrowserRow({
          id: "bad_api",
          expect: { ui: "Visible", api: "   " },
        }),
        makeBrowserRow({
          id: "bad_shortfall",
          status: "shortfall",
          when: "",
          source: null,
          expect: null,
          shortfall: "   ",
          question: { ask: "Open?", recommend: "No" },
        }),
        makeBrowserRow({
          id: "bad_shortfall_api",
          status: "shortfall",
          shortfall: "Bug",
          expect: { ui: "Visible", api: "" },
        }),
        makeBrowserRow({
          id: "bad_struck",
          status: "struck",
          reason: null,
          shortfall: "stale",
        }),
      ],
    };

    const errors = validateOracleFile(invalidFile, "browser", "page.oracle.yaml");
    assert.ok(errors.some((e) => e.includes("[bad_active]: active row must have shortfall: null")));
    assert.ok(
      errors.some((e) =>
        e.includes("[bad_active]: active row without question requires non-empty when"),
      ),
    );
    assert.ok(
      errors.some((e) => e.includes("[bad_active]: active row without question requires source")),
    );
    assert.ok(
      errors.some((e) =>
        e.includes("[bad_active]: browser active row requires non-empty expect.ui"),
      ),
    );
    assert.ok(
      errors.some((e) =>
        e.includes("[bad_api]: browser expect.api must be non-empty when present"),
      ),
    );
    assert.ok(
      errors.some((e) => e.includes("[bad_shortfall]: shortfall row must have question: null")),
    );
    assert.ok(
      errors.some((e) => e.includes("[bad_shortfall]: shortfall row requires non-empty shortfall")),
    );
    assert.ok(
      errors.some((e) => e.includes("[bad_shortfall]: shortfall row requires non-empty when")),
    );
    assert.ok(errors.some((e) => e.includes("[bad_shortfall]: shortfall row requires source")));
    assert.ok(
      errors.some((e) =>
        e.includes("[bad_shortfall]: browser shortfall row requires non-empty expect.ui"),
      ),
    );
    assert.ok(
      errors.some((e) =>
        e.includes("[bad_shortfall_api]: browser expect.api must be non-empty when present"),
      ),
    );
    assert.ok(errors.some((e) => e.includes("[bad_struck]: struck row requires non-empty reason")));
    assert.ok(errors.some((e) => e.includes("[bad_struck]: struck row must have shortfall: null")));
  });

  it("validates cli and api-contract string expectations", () => {
    for (const kind of ["cli", "api-contract"] as const) {
      const validFile: OracleFile = {
        kind,
        slice: "core",
        rows: [
          makeSimpleRow({ id: "ok_active" }),
          makeSimpleRow({ id: "ok_shortfall", status: "shortfall", shortfall: "Returns 500" }),
        ],
      };
      assert.deepEqual(validateOracleFile(validFile, kind, "core.oracle.yaml"), []);

      const invalidFile: OracleFile = {
        kind,
        slice: "core",
        rows: [
          makeSimpleRow({ id: "empty_active", expect: "   " }),
          makeSimpleRow({
            id: "empty_shortfall",
            status: "shortfall",
            shortfall: "Bug",
            expect: null,
          }),
        ],
      };
      const errors = validateOracleFile(invalidFile, kind, "core.oracle.yaml");
      assert.deepEqual(errors, [
        `core.oracle.yaml [empty_active]: ${kind} active row requires non-empty expect`,
        `core.oracle.yaml [empty_shortfall]: ${kind} shortfall row requires non-empty expect`,
      ]);
    }
  });
});
