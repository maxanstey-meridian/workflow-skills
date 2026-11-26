import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import YAML from "yaml";
import type { ReviewReport } from "../../contracts/src/report-schemas.ts";
import {
  collectExistingFindingPaths,
  loadJustifiedMachineryForAudit,
  measureFileLines,
} from "../src/io.ts";
import {
  MAX_LINES_PER_LIST,
  assignNewPathsToSlices,
  autoSlice,
  isFrontendPath,
  planFixSlices,
  sortNewPaths,
  validateSlices,
} from "../src/slices.ts";
import type { RawReportEntry } from "../src/transition.ts";

describe("isFrontendPath and autoSlice", () => {
  it("classifies frontend extensions and directories vs backend paths", () => {
    assert.equal(isFrontendPath("src/Button.vue"), true);
    assert.equal(isFrontendPath("src/Page.tsx"), true);
    assert.equal(isFrontendPath("src/Card.jsx"), true);
    assert.equal(isFrontendPath("styles/theme.scss"), true);
    assert.equal(isFrontendPath("index.html"), true);
    assert.equal(isFrontendPath("web/main.ts"), true);
    assert.equal(isFrontendPath("apps/frontend/util.ts"), true);
    assert.equal(isFrontendPath("packages/ui/tokens.ts"), true);
    assert.equal(isFrontendPath("client/api.ts"), true);
    assert.equal(isFrontendPath("app/components/Nav.ts"), true);
    assert.equal(isFrontendPath("app/pages/home.ts"), true);
    assert.equal(isFrontendPath("app/composables/useAuth.ts"), true);

    assert.equal(isFrontendPath("src/server.ts"), false);
    assert.equal(isFrontendPath("scripts/build.sh"), false);
    assert.equal(isFrontendPath("README.md"), false);
    assert.equal(isFrontendPath("app/utils/format.ts"), false);
  });

  it("auto-slices <= 15 paths into slice-1 with backend/frontend split and omits empty stacks", () => {
    const mixed = autoSlice(["src/api.ts", "app/pages/index.vue", "README.md"]);
    assert.notEqual(mixed, null);
    assert.deepEqual(mixed?.slices, [
      { id: 1, files: ["README.md", "app/pages/index.vue", "src/api.ts"] },
    ]);
    assert.deepEqual(mixed?.stacks.backend, [["README.md", "src/api.ts"]]);
    assert.deepEqual(mixed?.stacks.frontend, [["app/pages/index.vue"]]);

    const backendOnly = autoSlice(["src/a.ts", "src/b.ts"]);
    assert.deepEqual(backendOnly?.stacks.backend, [["src/a.ts", "src/b.ts"]]);
    assert.deepEqual(backendOnly?.stacks.frontend, []);

    const frontendOnly = autoSlice(["web/a.ts", "ui/b.css"]);
    assert.deepEqual(frontendOnly?.stacks.backend, []);
    assert.deepEqual(frontendOnly?.stacks.frontend, [["ui/b.css", "web/a.ts"]]);
  });

  it("returns null for 0 paths or > 15 paths", () => {
    assert.equal(autoSlice([]), null);
    const sixteen = Array.from({ length: 16 }, (_, i) => `src/f${i + 1}.ts`);
    assert.equal(autoSlice(sixteen), null);
  });

  it("enforces the 3,500-line budget across multiple files while exempting a single large file", () => {
    assert.equal(MAX_LINES_PER_LIST, 3500);

    const overBudget = autoSlice(["src/a.ts", "src/b.ts"], {
      "src/a.ts": 2000,
      "src/b.ts": 1501,
    });
    assert.equal(overBudget, null);

    const atBudget = autoSlice(["src/a.ts", "src/b.ts"], {
      "src/a.ts": 2000,
      "src/b.ts": 1500,
    });
    assert.notEqual(atBudget, null);

    const singleLarge = autoSlice(["src/huge.ts"], {
      "src/huge.ts": 5000,
    });
    assert.notEqual(singleLarge, null);
    assert.deepEqual(singleLarge?.slices, [{ id: 1, files: ["src/huge.ts"] }]);
  });
});

describe("validateSlices", () => {
  const scope = ["a.ts", "b.ts", "c.vue"];

  it("accepts valid disjoint full-coverage slices and stacks", () => {
    const res = validateSlices(
      {
        slices: [
          { id: 1, files: ["a.ts", "b.ts"] },
          { id: 2, files: ["c.vue"] },
        ],
        stacks: {
          backend: [["a.ts", "b.ts"]],
          frontend: [["c.vue"]],
        },
      },
      scope,
    );
    assert.equal(res.ok, true);
  });

  it("rejects missing scope paths, duplicate paths, unknown paths, and duplicate slice IDs", () => {
    const missing = validateSlices(
      {
        slices: [{ id: 1, files: ["a.ts", "b.ts"] }],
        stacks: { backend: [["a.ts", "b.ts"]], frontend: [] },
      },
      scope,
    );
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.ok(missing.errors.some((e) => e.includes('slices: missing scope path "c.vue"')));
      assert.ok(missing.errors.some((e) => e.includes('stacks: missing scope path "c.vue"')));
    }

    const dupAndUnknown = validateSlices(
      {
        slices: [
          { id: 1, files: ["a.ts", "b.ts"] },
          { id: 1, files: ["b.ts", "c.vue", "ghost.ts"] },
        ],
        stacks: {
          backend: [["a.ts", "b.ts"]],
          frontend: [["b.ts", "c.vue", "ghost.ts"]],
        },
      },
      scope,
    );
    assert.equal(dupAndUnknown.ok, false);
    if (!dupAndUnknown.ok) {
      assert.ok(dupAndUnknown.errors.some((e) => e.includes("duplicate slice ID 1")));
      assert.ok(dupAndUnknown.errors.some((e) => e.includes('"b.ts" already appears in slice 1')));
      assert.ok(dupAndUnknown.errors.some((e) => e.includes('"ghost.ts" is not in scope')));
      assert.ok(
        dupAndUnknown.errors.some((e) => e.includes('"b.ts" already appears in stacks.backend[0]')),
      );
    }
  });

  it("rejects slices or stack lists over the 25-path cap", () => {
    const twentySix = Array.from({ length: 26 }, (_, i) => `src/f${i + 1}.ts`);
    const overSliceCap = validateSlices(
      {
        slices: [{ id: 1, files: twentySix }],
        stacks: { backend: [twentySix.slice(0, 13), twentySix.slice(13)], frontend: [] },
      },
      twentySix,
    );
    assert.equal(overSliceCap.ok, false);
    if (!overSliceCap.ok) {
      assert.ok(overSliceCap.errors.some((e) => e.includes("slices[0].files")));
    }

    const overStackCap = validateSlices(
      {
        slices: [
          { id: 1, files: twentySix.slice(0, 13) },
          { id: 2, files: twentySix.slice(13) },
        ],
        stacks: { backend: [twentySix], frontend: [] },
      },
      twentySix,
    );
    assert.equal(overStackCap.ok, false);
    if (!overStackCap.ok) {
      assert.ok(overStackCap.errors.some((e) => e.includes("stacks.backend[0]")));
    }
  });

  it("rejects multi-file slices and stack lists over 3,500 lines and accepts single-file lists over 3,500 lines", () => {
    const bigScope = ["src/a.ts", "src/b.ts", "web/c.vue", "web/d.vue"];
    const fileLines = {
      "src/a.ts": 2100,
      "src/b.ts": 1600,
      "web/c.vue": 2000,
      "web/d.vue": 1700,
    };

    const overLineBudget = validateSlices(
      {
        slices: [
          { id: 1, files: ["src/a.ts", "src/b.ts"] },
          { id: 2, files: ["web/c.vue", "web/d.vue"] },
        ],
        stacks: {
          backend: [["src/a.ts", "src/b.ts"]],
          frontend: [["web/c.vue", "web/d.vue"]],
        },
      },
      bigScope,
      fileLines,
    );
    assert.equal(overLineBudget.ok, false);
    if (!overLineBudget.ok) {
      assert.ok(
        overLineBudget.errors.some(
          (e) =>
            e.includes("slices[0].files") &&
            e.includes("3700") &&
            e.includes("3500") &&
            e.includes("src/a.ts (2100)"),
        ),
      );
      assert.ok(
        overLineBudget.errors.some(
          (e) =>
            e.includes("stacks.backend[0]") &&
            e.includes("3700") &&
            e.includes("3500") &&
            e.includes("src/a.ts (2100)"),
        ),
      );
      assert.ok(
        overLineBudget.errors.some(
          (e) =>
            e.includes("stacks.frontend[0]") &&
            e.includes("3700") &&
            e.includes("3500") &&
            e.includes("web/c.vue (2000)"),
        ),
      );
    }

    const singleFileExempt = validateSlices(
      {
        slices: [
          { id: 1, files: ["src/huge.ts"] },
          { id: 2, files: ["web/huge.vue"] },
        ],
        stacks: {
          backend: [["src/huge.ts"]],
          frontend: [["web/huge.vue"]],
        },
      },
      ["src/huge.ts", "web/huge.vue"],
      { "src/huge.ts": 4200, "web/huge.vue": 3800 },
    );
    assert.equal(singleFileExempt.ok, true);
  });
});

describe("io helpers: measureFileLines, collectExistingFindingPaths, and loadJustifiedMachineryForAudit", () => {
  it("measures newline-delimited lines including empty, missing, and no-trailing-newline files", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cycle-io-lines-"));
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, "subdir"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src/trailing.ts"), "line1\nline2\nline3\n", "utf8");
      fs.writeFileSync(path.join(tmpDir, "src/no-trailing.ts"), "line1\nline2", "utf8");
      fs.writeFileSync(path.join(tmpDir, "src/empty.ts"), "", "utf8");

      const lines = measureFileLines(tmpDir, [
        "src/trailing.ts",
        "src/no-trailing.ts",
        "src/empty.ts",
        "src/missing.ts",
        "subdir",
      ]);

      assert.deepEqual(lines, {
        "src/trailing.ts": 3,
        "src/no-trailing.ts": 2,
        "src/empty.ts": 0,
        "src/missing.ts": 0,
        subdir: 0,
      });
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("collectExistingFindingPaths parses doctrine review reports with DoctrineReviewReportSchema", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cycle-io-findings-"));
    try {
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "src/existing.ts"), "export const x = 1;\n", "utf8");
      fs.writeFileSync(path.join(tmpDir, "src/doctrine.ts"), "export const y = 2;\n", "utf8");

      const reports = new Map<string, RawReportEntry>([
        [
          "review-1-backend-1.yaml",
          {
            exists: true,
            raw: {
              findings: [
                {
                  id: "F1",
                  file: "src/doctrine.ts",
                  line: 1,
                  rule: "coding/use-a-maintained-library-before-building-machinery.md",
                  problem: "Hand-rolled parser.",
                  harm: "Duplicates maintained library.",
                  fix: "Use library.",
                  files: ["src/doctrine.ts", "src/missing.ts"],
                  do: "fix",
                },
              ],
              filesRead: [{ path: "src/doctrine.ts", mode: "full" }],
              machinery: [
                {
                  file: "src/doctrine.ts",
                  symbol: "CustomParser",
                  status: "broken",
                  findingId: "F1",
                },
              ],
            },
          },
        ],
        [
          "review-1-backend-2.yaml",
          {
            exists: true,
            raw: {
              findings: [
                {
                  id: "F2",
                  file: "src/existing.ts",
                  line: 1,
                  problem: "Missing machinery field makes doctrine report invalid.",
                  harm: "Should be ignored.",
                  fix: "Add machinery.",
                  files: ["src/existing.ts"],
                  do: "fix",
                },
              ],
              filesRead: [{ path: "src/existing.ts", mode: "full" }],
            },
          },
        ],
      ]);

      const existing = collectExistingFindingPaths(tmpDir, reports);
      assert.deepEqual([...existing], ["src/doctrine.ts"]);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("loadJustifiedMachineryForAudit loads justified entries and skips missedReports", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cycle-io-machinery-"));
    try {
      fs.writeFileSync(
        path.join(tmpDir, "review-1-backend-1.yaml"),
        YAML.stringify({
          findings: [],
          filesRead: [{ path: "src/parser.ts", mode: "full" }],
          machinery: [
            {
              file: "src/parser.ts",
              symbol: "CustomParser",
              status: "justified",
              candidatesChecked: ["lib-a 2.x"],
              constraint: "lib-a cannot stream tokens without buffering",
            },
          ],
        }),
        "utf8",
      );
      fs.writeFileSync(
        path.join(tmpDir, "review-1-backend-2.yaml"),
        YAML.stringify({
          findings: [],
          filesRead: [{ path: "src/ignored.ts", mode: "full" }],
          machinery: [
            {
              file: "src/ignored.ts",
              symbol: "IgnoredParser",
              status: "justified",
              candidatesChecked: ["lib-b 3.x"],
              constraint: "Should be skipped as missed.",
            },
          ],
        }),
        "utf8",
      );

      const loaded = loadJustifiedMachineryForAudit(tmpDir, ["review-1-backend-2.yaml"]);
      assert.equal(loaded.length, 1);
      assert.equal(loaded[0]?.report, "review-1-backend-1.yaml");
      assert.equal(loaded[0]?.file, "src/parser.ts");
      assert.equal(loaded[0]?.symbol, "CustomParser");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

describe("planFixSlices", () => {
  it("merges multi-slice do: fix findings into lowest slice, adds existing non-left-out files, and skips left-out or missing files", () => {
    const slices = {
      "1": ["src/a.ts"],
      "2": ["src/b.ts"],
      "3": ["src/c.ts"],
    };
    const reports: ReviewReport[] = [
      {
        findings: [
          {
            id: "F1",
            file: "src/b.ts",
            line: 10,
            problem: "Cross-slice bug.",
            harm: "Breaks invariant.",
            fix: "Fix both files and helper.",
            files: ["src/a.ts", "src/helper.ts", "src/excluded.ts", "src/missing.ts"],
            do: "fix",
          },
          {
            id: "F2",
            file: "src/c.ts",
            line: 5,
            problem: "Minor nit.",
            harm: "None.",
            fix: "Rename.",
            files: ["src/c.ts"],
            do: "nit",
          },
        ],
        filesRead: [{ path: "src/b.ts", mode: "full" }],
      },
    ];

    const plan = planFixSlices(
      slices,
      reports,
      new Set(["src/excluded.ts"]),
      new Set(["src/a.ts", "src/b.ts", "src/helper.ts", "src/excluded.ts"]),
    );

    assert.deepEqual(plan.merges, [{ from: 2, into: 1 }]);
    assert.deepEqual(plan.slices, {
      "1": ["src/a.ts", "src/b.ts", "src/helper.ts"],
      "3": ["src/c.ts"],
    });
    assert.deepEqual(plan.hitSliceIds, [1]);
    assert.deepEqual(plan.hitPaths, [
      "src/a.ts",
      "src/b.ts",
      "src/excluded.ts",
      "src/helper.ts",
      "src/missing.ts",
    ]);
  });
});

describe("sortNewPaths", () => {
  it("routes fixer-named new paths to scope and other-session new paths to leftOut", () => {
    const res = sortNewPaths(
      ["src/a.ts", "src/fixer-new.ts", "src/other-session.ts", "src/already-left.ts"],
      ["src/a.ts"],
      ["src/already-left.ts"],
      ["src/a.ts", "src/fixer-new.ts"],
    );

    assert.deepEqual(res.addedToScope, ["src/fixer-new.ts"]);
    assert.deepEqual(res.addedToLeftOut, ["src/other-session.ts"]);
    assert.deepEqual(res.scope, ["src/a.ts", "src/fixer-new.ts"]);
    assert.deepEqual(res.leftOut, ["src/already-left.ts", "src/other-session.ts"]);
    assert.deepEqual(res.fixed, ["src/a.ts", "src/fixer-new.ts"]);
  });
});

describe("assignNewPathsToSlices", () => {
  it("assigns fixer-created paths to owning fixer slice and never creates empty slice-0", () => {
    const slices = {
      "1": ["src/a.ts"],
      "2": ["src/b.ts"],
    };
    const next = assignNewPathsToSlices(["src/a.ts", "src/new-for-2.ts"], slices, {
      "2": ["src/new-for-2.ts"],
    });

    assert.deepEqual(next, {
      "1": ["src/a.ts"],
      "2": ["src/b.ts", "src/new-for-2.ts"],
    });
    assert.equal(Object.hasOwn(next, "0"), false);
  });

  it("creates slice-0 only when at least one fixed path is unassigned", () => {
    const slices = {
      "1": ["src/a.ts"],
    };
    const next = assignNewPathsToSlices(
      ["src/a.ts", "src/fixer-made.ts", "src/orphan.ts"],
      slices,
      { "1": ["src/fixer-made.ts"] },
    );

    assert.deepEqual(next, {
      "0": ["src/orphan.ts"],
      "1": ["src/a.ts", "src/fixer-made.ts"],
    });
  });
});
