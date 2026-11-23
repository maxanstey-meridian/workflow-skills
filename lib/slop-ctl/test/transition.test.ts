import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { designReaderBrief, hunterBrief, reporterBrief, verifierBrief } from "../src/briefs.ts";
import {
  type DesignReport,
  type HunterReport,
  SlopActionSchema,
  type SlopAudit,
  type SlopState,
  SlopStateSchema,
  type VerifyReport,
} from "../src/schemas.ts";
import {
  advanceSlop,
  MAX_CONCURRENCY,
  type RawYamlEntry,
  type SlopSnapshot,
} from "../src/transition.ts";

const makeState = (overrides: Partial<SlopState> = {}): SlopState => ({
  root: "/repo",
  mainDir: "/repo",
  skillDir: "/skills/slop-hunt",
  runDir: "/repo/.plans/scratch/slop-hunt-20260401-120000",
  head: "abc1234",
  scopeReviewed: false,
  areasSplit: false,
  retries: {},
  phase: "init",
  ...overrides,
});

const makeDesignReport = (overrides: Partial<DesignReport> = {}): DesignReport => ({
  houseShape: "Vertical slices under src/.",
  weightMap: [
    {
      capability: "Core",
      files: "src/core/",
      lines: 5000,
      sharePct: 50,
      status: "earned",
      earnedWhy: "Main product workflow",
    },
  ],
  findings: [
    {
      id: "D1",
      sign: 13,
      kind: "proven",
      risk: "low",
      where: "src/core/unused.ts",
      what: "Unused helper",
      replaceWith: "Delete it",
      removes: "20 lines",
      usersLose: "Nothing",
      proof: "Zero callers across repo",
      protectedBy: "None",
    },
  ],
  cleanup: [],
  alsoNoticed: [],
  leadsDropped: [],
  ...overrides,
});

const makeHunterReport = (overrides: Partial<HunterReport> = {}): HunterReport => ({
  weightMap: [
    {
      capability: "Area",
      files: "src/",
      lines: 500,
      sharePct: 100,
      status: "earned",
      earnedWhy: "Required feature",
    },
  ],
  findings: [
    {
      id: "#1",
      sign: 1,
      kind: "proven",
      risk: "low",
      where: "src/a.ts:10",
      what: "Dead branch",
      replaceWith: "Remove branch",
      removes: "10 lines",
      usersLose: "Nothing",
      proof: "Condition is always false",
      protectedBy: "None",
    },
  ],
  cleanup: [],
  alsoNoticed: [],
  leadsDropped: [],
  notesOnDesign: [],
  findersCouldntSee: [],
  notReadInFull: [],
  ...overrides,
});

const makeVerifyReport = (targetId: string): VerifyReport => ({
  verdicts: [
    {
      target: targetId,
      verdict: "kept",
      why: "Confirmed against code",
    },
  ],
  alsoNoticedVerdicts: [],
  cleanupVerdicts: [],
  raisedFromDroppedLeads: [],
});

const makeAudit = (): SlopAudit => ({
  tldr: "Repo is mostly earned.",
  findings: [],
  needsFromYou: [{ item: "Confirm cleanup", rec: "yes" }],
  weightMap: [
    {
      capability: "Core",
      lines: 1000,
      sharePct: 100,
      status: "earned",
      earnedWhy: "Main workflow",
    },
  ],
  design: [],
  code: [],
  cleanup: [],
  alsoNoticed: [],
  hunted: {
    repo: "repo",
    head: "abc1234",
    notReadInFull: [],
    leftOut: [],
    findersRun: [],
    skipped: [],
  },
});

const okEntry = (raw: unknown): RawYamlEntry => ({ exists: true, raw });

const assertValidResult = (state: SlopState, action: unknown): void => {
  assert.equal(SlopStateSchema.safeParse(state).success, true);
  assert.equal(SlopActionSchema.safeParse(action).success, true);
};

describe("brief builders", () => {
  const paths = {
    skillDir: "/skills/slop-hunt",
    runDir: "/repo/.plans/scratch/run-1",
  };

  it("emits the exact 4-line brief for all four roles", () => {
    assert.equal(
      designReaderBrief(paths),
      [
        "Read /skills/slop-hunt/references/design-reader.md in full, then do what it says.",
        "Hunt folder: /repo/.plans/scratch/run-1",
        "Yours: design",
        "Report: /repo/.plans/scratch/run-1/report-design.yaml",
      ].join("\n"),
    );

    assert.equal(
      hunterBrief(paths, "api-rest"),
      [
        "Read /skills/slop-hunt/references/hunter.md in full, then do what it says.",
        "Hunt folder: /repo/.plans/scratch/run-1",
        "Yours: api-rest",
        "Report: /repo/.plans/scratch/run-1/report-api-rest.yaml",
      ].join("\n"),
    );

    assert.equal(
      verifierBrief(paths, "design"),
      [
        "Read /skills/slop-hunt/references/verifier.md in full, then do what it says.",
        "Hunt folder: /repo/.plans/scratch/run-1",
        "Yours: report-design.yaml",
        "Report: /repo/.plans/scratch/run-1/verify-design.yaml",
      ].join("\n"),
    );

    assert.equal(
      verifierBrief(paths, "api"),
      [
        "Read /skills/slop-hunt/references/verifier.md in full, then do what it says.",
        "Hunt folder: /repo/.plans/scratch/run-1",
        "Yours: report-api.yaml",
        "Report: /repo/.plans/scratch/run-1/verify-api.yaml",
      ].join("\n"),
    );

    assert.equal(
      reporterBrief(paths),
      [
        "Read /skills/slop-hunt/references/reporter.md in full, then do what it says.",
        "Hunt folder: /repo/.plans/scratch/run-1",
        "Yours: all",
        "Report: /repo/.plans/scratch/run-1/audit.yaml",
      ].join("\n"),
    );
  });
});

describe("advanceSlop", () => {
  it("stops when no scannable files remain in scope", () => {
    const res = advanceSlop(makeState(), {
      scopeFiles: [],
      sizesByFile: new Map(),
      areasYaml: { exists: false },
      reports: new Map(),
    });
    assertValidResult(res.nextState, res.action);
    assert.equal(res.action.action, "stop");
  });

  it("emits review-scope when any file exceeds 2,000 lines and scopeReviewed is false", () => {
    const scopeFiles: string[] = [];
    const sizesByFile = new Map<string, number>();
    for (let i = 1; i <= 18; i += 1) {
      const file = `src/f${String(i).padStart(2, "0")}.ts`;
      scopeFiles.push(file);
      sizesByFile.set(file, i * 100);
    }
    scopeFiles.push("src/huge.ts", "src/borderline.ts");
    sizesByFile.set("src/huge.ts", 2001);
    sizesByFile.set("src/borderline.ts", 2000);

    const res = advanceSlop(makeState(), {
      scopeFiles,
      sizesByFile,
      areasYaml: { exists: false },
      reports: new Map(),
    });
    assertValidResult(res.nextState, res.action);
    assert.equal(res.nextState.phase, "review-scope");
    assert.equal(res.action.action, "review-scope");
    if (res.action.action === "review-scope") {
      assert.deepEqual(res.action.oversized, [{ path: "src/huge.ts", lines: 2001 }]);
      assert.equal(res.action.topBiggest.length, 15);
      assert.equal(res.action.topBiggest[0]?.path, "src/huge.ts");
      assert.equal(res.action.topBiggest[1]?.path, "src/borderline.ts");
    }

    const afterReview = advanceSlop(makeState({ scopeReviewed: true }), {
      scopeFiles: ["src/huge.ts"],
      sizesByFile: new Map([["src/huge.ts", 2500]]),
      areasYaml: { exists: false },
      reports: new Map(),
    });
    assertValidResult(afterReview.nextState, afterReview.action);
    assert.equal(afterReview.action.action, "spawn");
    assert.equal(afterReview.nextState.phase, "hunt");
  });

  it("auto-creates single area 'all' for small repos (<= 8,000 lines) and skips split and design-reader", () => {
    const scopeFiles = ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"];
    const sizesByFile = new Map([
      ["src/a.ts", 2000],
      ["src/b.ts", 2000],
      ["src/c.ts", 2000],
      ["src/d.ts", 2000],
    ]);

    const res = advanceSlop(makeState(), {
      scopeFiles,
      sizesByFile,
      areasYaml: { exists: false },
      reports: new Map(),
    });
    assertValidResult(res.nextState, res.action);
    assert.equal(res.nextState.areasSplit, true);
    assert.equal(res.nextState.phase, "hunt");
    assert.deepEqual(res.effects.writeAreas, {
      root: "/repo",
      head: "abc1234",
      areas: [
        { name: "all", lines: 8000, files: ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"] },
      ],
    });
    assert.equal(res.action.action, "spawn");
    if (res.action.action === "spawn") {
      assert.equal(res.action.parallel, true);
      assert.equal(res.action.maxConcurrency, MAX_CONCURRENCY);
      assert.equal(res.action.subagents.length, 1);
      assert.equal(res.action.subagents[0]?.role, "hunter");
      assert.equal(res.action.subagents[0]?.yours, "all");
    }
  });

  it("requires split for repos over 8,000 lines, reports validation errors, and enriches valid areas.yaml", () => {
    const scopeFiles = ["src/api/a.ts", "src/web/b.ts"];
    const sizesByFile = new Map([
      ["src/api/a.ts", 4500],
      ["src/web/b.ts", 3501],
    ]);
    const state = makeState({ scopeReviewed: true });

    const missing = advanceSlop(state, {
      scopeFiles,
      sizesByFile,
      areasYaml: { exists: false },
      reports: new Map(),
    });
    assertValidResult(missing.nextState, missing.action);
    assert.equal(missing.nextState.phase, "split");
    assert.equal(missing.action.action, "split");
    if (missing.action.action === "split") {
      assert.equal(missing.action.totalLines, 8001);
      assert.deepEqual(missing.action.errors, []);
    }

    const parseErr = advanceSlop(missing.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml: { exists: true, parseError: "bad yaml" },
      reports: new Map(),
    });
    assert.equal(parseErr.action.action, "split");
    if (parseErr.action.action === "split") {
      assert.deepEqual(parseErr.action.errors, ["bad yaml"]);
    }

    const schemaErr = advanceSlop(missing.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml: okEntry({ areas: [] }),
      reports: new Map(),
    });
    assert.equal(schemaErr.action.action, "split");
    if (schemaErr.action.action === "split") {
      assert.ok(schemaErr.action.errors.length > 0);
    }

    const coverageErr = advanceSlop(missing.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml: okEntry({
        areas: [{ name: "api", files: ["src/api/a.ts"] }],
      }),
      reports: new Map(),
    });
    assert.equal(coverageErr.action.action, "split");
    if (coverageErr.action.action === "split") {
      assert.ok(coverageErr.action.errors.some((err) => err.includes("src/web/b.ts")));
    }

    const valid = advanceSlop(coverageErr.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml: okEntry({
        areas: [
          { name: "api", files: ["src/api/a.ts"] },
          { name: "web", files: ["src/web/b.ts"] },
        ],
      }),
      reports: new Map(),
    });
    assertValidResult(valid.nextState, valid.action);
    assert.equal(valid.nextState.areasSplit, true);
    assert.equal(valid.nextState.phase, "design");
    assert.deepEqual(valid.effects.writeAreas, {
      root: "/repo",
      head: "abc1234",
      areas: [
        { name: "api", lines: 4500, files: ["src/api/a.ts"] },
        { name: "web", lines: 3501, files: ["src/web/b.ts"] },
      ],
    });
    assert.equal(valid.action.action, "spawn");
    if (valid.action.action === "spawn") {
      assert.equal(valid.action.parallel, false);
      assert.equal(valid.action.maxConcurrency, 1);
      assert.equal(valid.action.subagents[0]?.role, "design-reader");
    }
  });

  it("retries design-reader once on miss/invalid report and continues to hunters on second miss", () => {
    const scopeFiles = ["src/api/a.ts", "src/web/b.ts"];
    const sizesByFile = new Map([
      ["src/api/a.ts", 4500],
      ["src/web/b.ts", 4500],
    ]);
    const areasYaml = okEntry({
      root: "/repo",
      head: "abc1234",
      areas: [
        { name: "api", lines: 4500, files: ["src/api/a.ts"] },
        { name: "web", lines: 4500, files: ["src/web/b.ts"] },
      ],
    });

    const first = advanceSlop(makeState({ scopeReviewed: true, areasSplit: true }), {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports: new Map(),
    });
    assert.equal(first.action.action, "spawn");
    assert.equal(first.effects.writeAreas, undefined);
    assert.equal(first.nextState.retries["design-reader"], 1);

    const retry = advanceSlop(first.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports: new Map([["report-design.yaml", { exists: true, parseError: "folded scalar" }]]),
    });
    assert.equal(retry.action.action, "spawn");
    if (retry.action.action === "spawn") {
      assert.equal(retry.action.subagents[0]?.role, "design-reader");
    }
    assert.equal(retry.nextState.retries["design-reader"], 2);

    const afterSecondMiss = advanceSlop(retry.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports: new Map(),
    });
    assertValidResult(afterSecondMiss.nextState, afterSecondMiss.action);
    assert.equal(afterSecondMiss.nextState.phase, "hunt");
    assert.equal(afterSecondMiss.action.action, "spawn");
    if (afterSecondMiss.action.action === "spawn") {
      assert.deepEqual(
        afterSecondMiss.action.subagents.map((task) => task.yours),
        ["api", "web"],
      );
    }
  });

  it("caps hunter and verifier spawns at 8 per batch and only counts retries for spawned items", () => {
    const scopeFiles: string[] = [];
    const sizesByFile = new Map<string, number>();
    const areas = [];
    const reports = new Map<string, RawYamlEntry>([
      ["report-design.yaml", okEntry(makeDesignReport())],
    ]);

    for (let i = 1; i <= 10; i += 1) {
      const name = `area-${i}`;
      const file = `src/${name}/index.ts`;
      scopeFiles.push(file);
      sizesByFile.set(file, 1000);
      areas.push({ name, lines: 1000, files: [file] });
    }
    const areasYaml = okEntry({ root: "/repo", head: "abc1234", areas });

    const batch1 = advanceSlop(makeState({ scopeReviewed: true, areasSplit: true }), {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports,
    });
    assert.equal(batch1.action.action, "spawn");
    if (batch1.action.action === "spawn") {
      assert.equal(batch1.action.subagents.length, 8);
      assert.equal(batch1.action.maxConcurrency, 8);
      assert.equal(batch1.action.parallel, true);
      assert.equal(batch1.action.subagents[0]?.yours, "area-1");
      assert.equal(batch1.action.subagents[7]?.yours, "area-8");
    }
    assert.equal(batch1.nextState.retries["hunter:area-8"], 1);
    assert.equal(batch1.nextState.retries["hunter:area-9"], undefined);

    for (let i = 1; i <= 8; i += 1) {
      reports.set(`report-area-${i}.yaml`, okEntry(makeHunterReport()));
    }

    const batch2 = advanceSlop(batch1.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports,
    });
    assert.equal(batch2.action.action, "spawn");
    if (batch2.action.action === "spawn") {
      assert.deepEqual(
        batch2.action.subagents.map((task) => task.yours),
        ["area-9", "area-10"],
      );
    }

    reports.set("report-area-9.yaml", okEntry(makeHunterReport()));
    reports.set("report-area-10.yaml", okEntry(makeHunterReport()));

    const verifyBatch1 = advanceSlop(batch2.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports,
    });
    assert.equal(verifyBatch1.nextState.phase, "verify");
    assert.equal(verifyBatch1.action.action, "spawn");
    if (verifyBatch1.action.action === "spawn") {
      assert.equal(verifyBatch1.action.subagents.length, 8);
      assert.equal(verifyBatch1.action.maxConcurrency, 8);
      assert.equal(verifyBatch1.action.subagents[0]?.yours, "report-design.yaml");
      assert.equal(verifyBatch1.action.subagents[7]?.yours, "report-area-7.yaml");
    }
    assert.equal(verifyBatch1.nextState.retries["verifier:area-7"], 1);
    assert.equal(verifyBatch1.nextState.retries["verifier:area-8"], undefined);

    reports.set("verify-design.yaml", okEntry(makeVerifyReport("D1")));
    for (let i = 1; i <= 7; i += 1) {
      reports.set(`verify-area-${i}.yaml`, okEntry(makeVerifyReport("#1")));
    }

    const verifyBatch2 = advanceSlop(verifyBatch1.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports,
    });
    assert.equal(verifyBatch2.action.action, "spawn");
    if (verifyBatch2.action.action === "spawn") {
      assert.deepEqual(
        verifyBatch2.action.subagents.map((task) => task.yours),
        ["report-area-8.yaml", "report-area-9.yaml", "report-area-10.yaml"],
      );
    }
  });

  it("creates -rest areas from in-area notReadInFull (normalizing leading ./), ignores out-of-area paths, and never recurses on -rest", () => {
    const scopeFiles = ["src/api/a.ts", "src/api/b.ts", "src/web/c.ts"];
    const sizesByFile = new Map([
      ["src/api/a.ts", 2000],
      ["src/api/b.ts", 1500],
      ["src/web/c.ts", 5000],
    ]);
    const initialAreas = {
      root: "/repo",
      head: "abc1234",
      areas: [
        { name: "api", lines: 3500, files: ["src/api/a.ts", "src/api/b.ts"] },
        { name: "web", lines: 5000, files: ["src/web/c.ts"] },
      ],
    };

    const reports = new Map<string, RawYamlEntry>([
      ["report-design.yaml", okEntry(makeDesignReport())],
      [
        "report-api.yaml",
        okEntry(
          makeHunterReport({
            notReadInFull: [
              "./src/api/b.ts",
              "././src/api/b.ts",
              "src/api/b.ts",
              "src/web/c.ts",
              "src/unknown.ts",
            ],
          }),
        ),
      ],
      [
        "report-web.yaml",
        okEntry(
          makeHunterReport({
            notReadInFull: ["src/api/a.ts"],
          }),
        ),
      ],
    ]);

    const res = advanceSlop(
      makeState({
        scopeReviewed: true,
        areasSplit: true,
        phase: "hunt",
        retries: { "design-reader": 1, "hunter:api": 1, "hunter:web": 1 },
      }),
      {
        scopeFiles,
        sizesByFile,
        areasYaml: okEntry(initialAreas),
        reports,
      },
    );
    assertValidResult(res.nextState, res.action);
    assert.deepEqual(res.effects.writeAreas, {
      root: "/repo",
      head: "abc1234",
      areas: [
        { name: "api", lines: 3500, files: ["src/api/a.ts", "src/api/b.ts"] },
        { name: "web", lines: 5000, files: ["src/web/c.ts"] },
        { name: "api-rest", lines: 1500, files: ["src/api/b.ts"] },
      ],
    });
    assert.equal(res.action.action, "spawn");
    if (res.action.action === "spawn") {
      assert.deepEqual(
        res.action.subagents.map((task) => task.yours),
        ["api-rest"],
      );
    }

    const updatedAreas = res.effects.writeAreas;
    assert.ok(updatedAreas !== undefined);
    reports.set(
      "report-api-rest.yaml",
      okEntry(
        makeHunterReport({
          notReadInFull: ["src/api/b.ts"],
        }),
      ),
    );

    const afterRest = advanceSlop(res.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml: okEntry(updatedAreas),
      reports,
    });
    assertValidResult(afterRest.nextState, afterRest.action);
    assert.equal(afterRest.effects.writeAreas, undefined);
    assert.equal(afterRest.nextState.phase, "verify");
    assert.equal(afterRest.action.action, "spawn");
    if (afterRest.action.action === "spawn") {
      assert.deepEqual(
        afterRest.action.subagents.map((task) => task.yours),
        ["report-design.yaml", "report-api.yaml", "report-web.yaml", "report-api-rest.yaml"],
      );
    }
  });

  it("enforces singleArea houseShape on base hunter but not on its -rest follow-up", () => {
    const scopeFiles = ["src/a.ts", "src/b.ts"];
    const sizesByFile = new Map([
      ["src/a.ts", 100],
      ["src/b.ts", 200],
    ]);
    const areasYaml = okEntry({
      root: "/repo",
      head: "abc1234",
      areas: [{ name: "all", lines: 300, files: scopeFiles }],
    });

    const missingHouseShape = advanceSlop(
      makeState({ areasSplit: true, phase: "hunt", retries: { "hunter:all": 1 } }),
      {
        scopeFiles,
        sizesByFile,
        areasYaml,
        reports: new Map([["report-all.yaml", okEntry(makeHunterReport())]]),
      },
    );
    assert.equal(missingHouseShape.action.action, "spawn");
    assert.equal(missingHouseShape.nextState.retries["hunter:all"], 2);

    const withHouseShape = advanceSlop(
      makeState({ areasSplit: true, phase: "hunt", retries: { "hunter:all": 1 } }),
      {
        scopeFiles,
        sizesByFile,
        areasYaml,
        reports: new Map([
          [
            "report-all.yaml",
            okEntry(
              makeHunterReport({
                houseShape: "Small CLI.",
                notReadInFull: ["src/b.ts"],
              }),
            ),
          ],
        ]),
      },
    );
    assert.equal(withHouseShape.action.action, "spawn");
    assert.ok(withHouseShape.effects.writeAreas !== undefined);

    const restDone = advanceSlop(withHouseShape.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml: okEntry(withHouseShape.effects.writeAreas),
      reports: new Map([
        [
          "report-all.yaml",
          okEntry(
            makeHunterReport({
              houseShape: "Small CLI.",
              notReadInFull: ["src/b.ts"],
            }),
          ),
        ],
        ["report-all-rest.yaml", okEntry(makeHunterReport())],
      ]),
    });
    assert.equal(restDone.nextState.phase, "verify");
  });

  it("stops retrying a hunter after a second miss and excludes it from verifyTargets", () => {
    const scopeFiles = ["src/api/a.ts", "src/web/b.ts"];
    const sizesByFile = new Map([
      ["src/api/a.ts", 4500],
      ["src/web/b.ts", 4500],
    ]);
    const areasYaml = okEntry({
      root: "/repo",
      head: "abc1234",
      areas: [
        { name: "api", lines: 4500, files: ["src/api/a.ts"] },
        { name: "web", lines: 4500, files: ["src/web/b.ts"] },
      ],
    });
    const reports = new Map<string, RawYamlEntry>([
      ["report-design.yaml", okEntry(makeDesignReport())],
      ["report-api.yaml", okEntry(makeHunterReport())],
      ["report-web.yaml", { exists: true, parseError: "folded scalar" }],
    ]);

    const first = advanceSlop(
      makeState({
        scopeReviewed: true,
        areasSplit: true,
        phase: "hunt",
        retries: { "design-reader": 1, "hunter:api": 1 },
      }),
      {
        scopeFiles,
        sizesByFile,
        areasYaml,
        reports,
      },
    );
    assertValidResult(first.nextState, first.action);
    assert.equal(first.nextState.phase, "hunt");
    assert.equal(first.nextState.retries["hunter:web"], 1);
    assert.equal(first.action.action, "spawn");
    if (first.action.action === "spawn") {
      assert.deepEqual(
        first.action.subagents.map((task) => task.yours),
        ["web"],
      );
    }

    const retry = advanceSlop(first.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports,
    });
    assertValidResult(retry.nextState, retry.action);
    assert.equal(retry.nextState.phase, "hunt");
    assert.equal(retry.nextState.retries["hunter:web"], 2);
    assert.equal(retry.action.action, "spawn");
    if (retry.action.action === "spawn") {
      assert.deepEqual(
        retry.action.subagents.map((task) => task.yours),
        ["web"],
      );
    }

    const settled = advanceSlop(retry.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports,
    });
    assertValidResult(settled.nextState, settled.action);
    assert.equal(settled.nextState.phase, "verify");
    assert.equal(settled.nextState.retries["hunter:web"], 2);
    assert.equal(settled.action.action, "spawn");
    if (settled.action.action === "spawn") {
      assert.deepEqual(
        settled.action.subagents.map((task) => ({ role: task.role, yours: task.yours })),
        [
          { role: "verifier", yours: "report-design.yaml" },
          { role: "verifier", yours: "report-api.yaml" },
        ],
      );
    }
  });

  it("retries verifier on cross-check failure and advances to reporter after second miss", () => {
    const scopeFiles = ["src/a.ts"];
    const sizesByFile = new Map([["src/a.ts", 200]]);
    const areasYaml = okEntry({
      root: "/repo",
      head: "abc1234",
      areas: [{ name: "all", lines: 200, files: scopeFiles }],
    });
    const baseSnapshot: SlopSnapshot = {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports: new Map([
        ["report-all.yaml", okEntry(makeHunterReport({ houseShape: "CLI" }))],
        [
          "verify-all.yaml",
          okEntry({
            verdicts: [],
            alsoNoticedVerdicts: [],
            cleanupVerdicts: [],
            raisedFromDroppedLeads: [],
          }),
        ],
      ]),
    };

    const first = advanceSlop(makeState({ areasSplit: true, phase: "hunt" }), baseSnapshot);
    assert.equal(first.nextState.phase, "verify");
    assert.equal(first.nextState.retries["verifier:all"], 1);

    const retry = advanceSlop(first.nextState, baseSnapshot);
    assert.equal(retry.nextState.phase, "verify");
    assert.equal(retry.nextState.retries["verifier:all"], 2);

    const settled = advanceSlop(retry.nextState, baseSnapshot);
    assertValidResult(settled.nextState, settled.action);
    assert.equal(settled.nextState.phase, "report");
    assert.equal(settled.action.action, "spawn");
    if (settled.action.action === "spawn") {
      assert.equal(settled.action.subagents[0]?.role, "reporter");
    }
  });

  it("retries reporter once, stops on second miss, and relays idempotently when audit.yaml is valid", () => {
    const scopeFiles = ["src/a.ts"];
    const sizesByFile = new Map([["src/a.ts", 200]]);
    const areasYaml = okEntry({
      root: "/repo",
      head: "abc1234",
      areas: [{ name: "all", lines: 200, files: scopeFiles }],
    });
    const baseReports = new Map<string, RawYamlEntry>([
      ["report-all.yaml", okEntry(makeHunterReport({ houseShape: "CLI" }))],
      ["verify-all.yaml", okEntry(makeVerifyReport("#1"))],
    ]);

    const first = advanceSlop(makeState({ areasSplit: true }), {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports: baseReports,
    });
    assert.equal(first.nextState.phase, "report");
    assert.equal(first.nextState.retries["reporter"], 1);

    const invalidAuditReports = new Map(baseReports);
    invalidAuditReports.set("audit.yaml", okEntry({ ...makeAudit(), tldr: "   " }));

    const retry = advanceSlop(first.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports: invalidAuditReports,
    });
    assert.equal(retry.action.action, "spawn");
    assert.equal(retry.nextState.retries["reporter"], 2);

    const stopped = advanceSlop(retry.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports: invalidAuditReports,
    });
    assertValidResult(stopped.nextState, stopped.action);
    assert.equal(stopped.action.action, "stop");
    if (stopped.action.action === "stop") {
      assert.ok((stopped.action.details?.length ?? 0) > 0);
    }

    const validAuditReports = new Map(baseReports);
    validAuditReports.set("audit.yaml", okEntry(makeAudit()));

    const done = advanceSlop(retry.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports: validAuditReports,
    });
    assertValidResult(done.nextState, done.action);
    assert.equal(done.nextState.phase, "done");
    assert.equal(done.action.action, "relay");
    assert.ok(done.effects.renderReport !== undefined);
    assert.equal(
      done.effects.renderReport.reportPath,
      "/repo/.plans/scratch/slop-hunt-20260401-120000/report.md",
    );
    assert.ok(done.effects.renderReport.markdown.includes("## TLDR\nRepo is mostly earned."));

    const idempotent = advanceSlop(done.nextState, {
      scopeFiles,
      sizesByFile,
      areasYaml,
      reports: new Map(),
    });
    assertValidResult(idempotent.nextState, idempotent.action);
    assert.equal(idempotent.nextState.phase, "done");
    assert.deepEqual(idempotent.action, {
      action: "relay",
      report: "/repo/.plans/scratch/slop-hunt-20260401-120000/report.md",
    });
    assert.deepEqual(idempotent.effects, {});
  });
});
