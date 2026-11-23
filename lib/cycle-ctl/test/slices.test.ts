import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReviewReport } from "../../contracts/src/report-schemas.ts";
import {
  assignNewPathsToSlices,
  autoSlice,
  isFrontendPath,
  planFixSlices,
  sortNewPaths,
  validateSlices,
} from "../src/slices.ts";

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
