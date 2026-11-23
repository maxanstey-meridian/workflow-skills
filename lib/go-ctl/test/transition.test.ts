import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { renderGoAudit } from "../../contracts/src/render.ts";
import type {
  BuildReport,
  GoAuditReport,
  GoCriticReport,
} from "../../contracts/src/report-schemas.ts";
import type { Spec } from "../../contracts/src/spec-schema.ts";
import {
  AUDIT_REPORT_FILE_NAME,
  buildReportFileName,
  criticReportFileName,
} from "../src/briefs.ts";
import type { GoState } from "../src/state.ts";
import { advanceGo, type ReportsOnDisk, selectReadyPieces } from "../src/transition.ts";

const SKILL_DIR = "/repo/skills/go";
const MAIN_DIR = "/repo";
const SPEC_PATH = "/repo/.plans/spec-demo.yaml";
const RUN_DIR = "/repo/.plans/scratch/spec-demo/go";

const makeState = (overrides: Partial<GoState> = {}): GoState => ({
  specPath: SPEC_PATH,
  mainDir: MAIN_DIR,
  skillDir: SKILL_DIR,
  runDir: RUN_DIR,
  phase: { kind: "idle" },
  failedPieces: [],
  retries: {},
  ...overrides,
});

const makeSpec = (overrides: Partial<Spec> = {}): Spec => ({
  title: "Demo spec",
  status: "building",
  intent: "Build demo.",
  premise: [],
  decisions: [
    {
      id: "D1",
      title: "Pure core",
      what: "Keep transitions pure.",
      why: "Deterministic tests.",
      decidedBy: "agreed",
    },
  ],
  openAsks: [],
  builtPieces: [],
  pieces: [
    {
      id: "P1",
      name: "First piece",
      owns: ["a.ts"],
      after: [],
      now: "missing",
      reuse: "none",
      change: "add a.ts",
      proof: "test a",
    },
    {
      id: "P2",
      name: "Second piece",
      owns: ["b.ts"],
      after: [],
      now: "missing",
      reuse: "none",
      change: "add b.ts",
      proof: "test b",
    },
    {
      id: "P3",
      name: "Third piece",
      owns: ["c.ts"],
      after: ["P1"],
      now: "missing",
      reuse: "none",
      change: "add c.ts",
      proof: "test c",
    },
  ],
  invariantsAndDocs: [],
  doneMeans: [{ cmd: "pnpm test", proves: "all pass" }],
  onlyUserCan: [],
  outOfScope: [],
  parked: [],
  ...overrides,
});

const okBuild = (piece: string, attempt: 1 | 2): BuildReport => ({
  piece,
  attempt,
  changed: [{ path: "a.ts", summary: "added" }],
  decisionsBuilt: [{ id: "D1", summary: "kept pure" }],
  ran: [{ cmd: "pnpm test", exit: 0 }],
  notRun: [],
  notBuilt: [],
  result: "BUILT",
});

const stoppedBuild = (piece: string, attempt: 1 | 2): BuildReport => ({
  piece,
  attempt,
  changed: [],
  decisionsBuilt: [],
  ran: [],
  notRun: [],
  notBuilt: [],
  result: "STOPPED",
  stopReason: "Spec leaves choice open",
});

const okCritic = (piece: string, attempt: 1 | 2, verdict: "PASS" | "FAIL"): GoCriticReport => ({
  piece,
  attempt,
  ran: [{ cmd: "pnpm test", exit: 0 }],
  notRun: [],
  missing: verdict === "FAIL" ? ["missing branch"] : [],
  extra: [],
  misunderstood: [],
  shrunkCheck: [],
  unproven: [],
  verdict,
});

const okAudit = (builtPieces: string[]): GoAuditReport => ({
  tldr: "Built and verified.",
  findings: [],
  needsFromYou: [],
  pieces: [
    { id: "P1", status: builtPieces.includes("P1") ? "done" : "not-done" },
    { id: "P2", status: builtPieces.includes("P2") ? "done" : "not-done" },
    { id: "P3", status: builtPieces.includes("P3") ? "done" : "not-done" },
  ],
  decisions: [{ id: "D1", status: "honoured" }],
  checked: [{ cmd: "pnpm test", exit: 0 }],
  notChecked: [],
  parked: [],
  builtPieces,
});

describe("selectReadyPieces", () => {
  it("selects pieces whose dependencies are built and excludes built or failed pieces", () => {
    const spec = makeSpec({
      pieces: [
        ...makeSpec().pieces,
        {
          id: "P4",
          name: "Fourth piece",
          owns: ["d.ts"],
          after: ["P1", "P2"],
          now: "missing",
          reuse: "none",
          change: "add d.ts",
          proof: "test d",
        },
      ],
    });

    assert.deepEqual(selectReadyPieces(spec, [], []), ["P1", "P2"]);
    assert.deepEqual(selectReadyPieces(spec, ["P1"], []), ["P2", "P3"]);
    assert.deepEqual(selectReadyPieces(spec, ["P1"], ["P2"]), ["P3"]);
    assert.deepEqual(selectReadyPieces(spec, ["P1", "P2"], []), ["P3", "P4"]);
  });
});

describe("advanceGo — DAG rounds and parallel builders", () => {
  it("spawns all ready attempt-1 builders in parallel with literal .yaml report paths", () => {
    const res = advanceGo(makeState(), makeSpec(), {});
    assert.deepEqual(res.state.phase, { kind: "building", pieces: ["P1", "P2"] });
    assert.equal(res.action.action, "spawn");
    if (res.action.action !== "spawn") {
      return;
    }
    assert.equal(res.action.parallel, true);
    assert.equal(res.action.subagents.length, 2);
    assert.equal(res.action.subagents[0]?.role, "builder");
    assert.equal(res.action.subagents[0]?.piece, "P1");
    assert.equal(res.action.subagents[0]?.attempt, 1);
    assert.equal(
      res.action.subagents[0]?.brief,
      [
        `Read ${path.join(SKILL_DIR, "references", "builder.md")} in full, then do what it says.`,
        `Spec: ${SPEC_PATH}`,
        "Piece: P1 · attempt 1",
        `Report: ${path.join(RUN_DIR, "build-P1-1.yaml")}`,
      ].join("\n"),
    );
    assert.equal(res.action.subagents[1]?.piece, "P2");
  });

  it("retries only missed or invalid attempt-1 builders once, then marks second miss as failed", () => {
    const buildingState = makeState({ phase: { kind: "building", pieces: ["P1", "P2"] } });
    const reportsFirst: ReportsOnDisk = {
      [buildReportFileName("P1", 1)]: { kind: "ok", data: okBuild("P1", 1) },
      [buildReportFileName("P2", 1)]: { kind: "read-error", error: "bad yaml" },
    };

    const retryRes = advanceGo(buildingState, makeSpec(), reportsFirst);
    assert.deepEqual(retryRes.state.phase, { kind: "building", pieces: ["P1", "P2"] });
    assert.equal(retryRes.state.retries["build:P2:1"], 1);
    assert.equal(retryRes.action.action, "spawn");
    if (retryRes.action.action !== "spawn") {
      return;
    }
    assert.equal(retryRes.action.parallel, false);
    assert.equal(retryRes.action.subagents.length, 1);
    assert.equal(retryRes.action.subagents[0]?.piece, "P2");
    assert.equal(retryRes.action.subagents[0]?.attempt, 1);

    // Second miss on P2 marks P2 failed and starts sequential critique for P1.
    const secondMissRes = advanceGo(retryRes.state, makeSpec(), reportsFirst);
    assert.deepEqual(secondMissRes.state.failedPieces, ["P2"]);
    assert.deepEqual(secondMissRes.state.phase, {
      kind: "critiquing",
      piece: "P1",
      queue: [],
      retryQueue: [],
    });
    assert.equal(secondMissRes.action.action, "spawn");
    if (secondMissRes.action.action !== "spawn") {
      return;
    }
    assert.equal(secondMissRes.action.parallel, false);
    assert.equal(secondMissRes.action.subagents[0]?.role, "critic");
    assert.equal(secondMissRes.action.subagents[0]?.piece, "P1");
    assert.equal(secondMissRes.action.subagents[0]?.attempt, 1);
  });

  it("treats a build report with mismatched piece or attempt as a miss", () => {
    const buildingState = makeState({ phase: { kind: "building", pieces: ["P1"] } });
    const wrongPieceReports: ReportsOnDisk = {
      [buildReportFileName("P1", 1)]: { kind: "ok", data: okBuild("P2", 1) },
    };
    const res = advanceGo(buildingState, makeSpec(), wrongPieceReports);
    assert.equal(res.state.retries["build:P1:1"], 1);
    assert.deepEqual(res.state.phase, { kind: "building", pieces: ["P1"] });
  });

  it("marks a STOPPED builder as failed immediately without retry or critique", () => {
    const buildingState = makeState({ phase: { kind: "building", pieces: ["P1", "P2"] } });
    const reports: ReportsOnDisk = {
      [buildReportFileName("P1", 1)]: { kind: "ok", data: stoppedBuild("P1", 1) },
      [buildReportFileName("P2", 1)]: { kind: "ok", data: stoppedBuild("P2", 1) },
    };

    const res = advanceGo(buildingState, makeSpec(), reports);
    assert.deepEqual(res.state.failedPieces, ["P1", "P2"]);
    assert.equal(res.state.retries["build:P1:1"], undefined);
    // P3 depends on P1 (not built), so no ready pieces remain -> auditing.
    assert.deepEqual(res.state.phase, { kind: "auditing" });
    assert.equal(res.action.action, "spawn");
    if (res.action.action !== "spawn") {
      return;
    }
    assert.equal(res.action.subagents[0]?.role, "auditor");
    assert.equal(res.action.subagents[0]?.piece, "all");
    assert.equal(res.action.subagents[0]?.attempt, undefined);
  });
});

describe("advanceGo — sequential critics and attempt-2 retries", () => {
  it("runs critics sequentially, updates builtPieces on PASS, and retries FAIL on attempt 2", () => {
    const spec = makeSpec();
    const buildReports: ReportsOnDisk = {
      [buildReportFileName("P1", 1)]: { kind: "ok", data: okBuild("P1", 1) },
      [buildReportFileName("P2", 1)]: { kind: "ok", data: okBuild("P2", 1) },
    };

    // Building -> critique P1 first (P2 queued).
    const c1Start = advanceGo(
      makeState({ phase: { kind: "building", pieces: ["P1", "P2"] } }),
      spec,
      buildReports,
    );
    assert.deepEqual(c1Start.state.phase, {
      kind: "critiquing",
      piece: "P1",
      queue: ["P2"],
      retryQueue: [],
    });

    // P1 PASS -> adds P1 to specBuiltPieces, critiques P2 next.
    const c1Pass = advanceGo(c1Start.state, spec, {
      ...buildReports,
      [criticReportFileName("P1", 1)]: { kind: "ok", data: okCritic("P1", 1, "PASS") },
    });
    assert.deepEqual(c1Pass.specBuiltPieces, ["P1"]);
    assert.deepEqual(c1Pass.state.phase, {
      kind: "critiquing",
      piece: "P2",
      queue: [],
      retryQueue: [],
    });

    const specWithP1 = makeSpec({ builtPieces: ["P1"] });

    // P2 FAIL -> starts attempt-2 builder for P2 before next DAG round.
    const c2Fail = advanceGo(c1Pass.state, specWithP1, {
      ...buildReports,
      [criticReportFileName("P2", 1)]: { kind: "ok", data: okCritic("P2", 1, "FAIL") },
    });
    assert.equal(c2Fail.specBuiltPieces, undefined);
    assert.deepEqual(c2Fail.state.phase, { kind: "retrying_build", piece: "P2", queue: [] });
    assert.equal(c2Fail.action.action, "spawn");
    if (c2Fail.action.action !== "spawn") {
      return;
    }
    assert.equal(c2Fail.action.parallel, false);
    assert.equal(c2Fail.action.subagents[0]?.role, "builder");
    assert.equal(c2Fail.action.subagents[0]?.piece, "P2");
    assert.equal(c2Fail.action.subagents[0]?.attempt, 2);

    // P2 attempt-2 BUILT -> starts attempt-2 critic for P2.
    const b2Done = advanceGo(c2Fail.state, specWithP1, {
      [buildReportFileName("P2", 2)]: { kind: "ok", data: okBuild("P2", 2) },
    });
    assert.deepEqual(b2Done.state.phase, { kind: "retrying_critic", piece: "P2", queue: [] });
    assert.equal(b2Done.action.action, "spawn");
    if (b2Done.action.action !== "spawn") {
      return;
    }
    assert.equal(b2Done.action.subagents[0]?.role, "critic");
    assert.equal(b2Done.action.subagents[0]?.attempt, 2);

    // P2 attempt-2 PASS -> updates builtPieces and starts next round with P3.
    const c2Pass = advanceGo(b2Done.state, specWithP1, {
      [criticReportFileName("P2", 2)]: { kind: "ok", data: okCritic("P2", 2, "PASS") },
    });
    assert.deepEqual(c2Pass.specBuiltPieces, ["P1", "P2"]);
    assert.deepEqual(c2Pass.state.phase, { kind: "building", pieces: ["P3"] });
  });

  it("retries invalid critic-1 once and sends second miss to attempt 2", () => {
    const critState = makeState({
      phase: { kind: "critiquing", piece: "P1", queue: [], retryQueue: [] },
    });
    // Invalid critic: PASS with non-empty missing violates validateGoCritic.
    const invalidCritic: GoCriticReport = {
      ...okCritic("P1", 1, "PASS"),
      missing: ["not actually built"],
    };
    const reports: ReportsOnDisk = {
      [criticReportFileName("P1", 1)]: { kind: "ok", data: invalidCritic },
    };

    const retry = advanceGo(critState, makeSpec(), reports);
    assert.equal(retry.state.retries["critic:P1:1"], 1);
    assert.deepEqual(retry.state.phase, critState.phase);

    const secondMiss = advanceGo(retry.state, makeSpec(), reports);
    assert.deepEqual(secondMiss.state.phase, { kind: "retrying_build", piece: "P1", queue: [] });
  });

  it("handles attempt-2 builder miss, STOPPED, critic miss, and critic FAIL -> failedPieces", () => {
    const spec = makeSpec({ builtPieces: ["P1"] });

    // Attempt-2 builder miss -> retry once -> second miss -> failedPieces.
    const b2State = makeState({ phase: { kind: "retrying_build", piece: "P2", queue: [] } });
    const b2Retry = advanceGo(b2State, spec, {});
    assert.equal(b2Retry.state.retries["build:P2:2"], 1);
    const b2SecondMiss = advanceGo(b2Retry.state, spec, {});
    assert.deepEqual(b2SecondMiss.state.failedPieces, ["P2"]);
    assert.deepEqual(b2SecondMiss.state.phase, { kind: "building", pieces: ["P3"] });

    // Attempt-2 builder STOPPED -> failedPieces directly.
    const b2Stopped = advanceGo(b2State, spec, {
      [buildReportFileName("P2", 2)]: { kind: "ok", data: stoppedBuild("P2", 2) },
    });
    assert.deepEqual(b2Stopped.state.failedPieces, ["P2"]);

    // Attempt-2 critic miss -> retry once -> second miss -> failedPieces.
    const c2State = makeState({ phase: { kind: "retrying_critic", piece: "P2", queue: [] } });
    const c2Retry = advanceGo(c2State, spec, {});
    assert.equal(c2Retry.state.retries["critic:P2:2"], 1);
    const c2SecondMiss = advanceGo(c2Retry.state, spec, {});
    assert.deepEqual(c2SecondMiss.state.failedPieces, ["P2"]);

    // Attempt-2 critic FAIL -> failedPieces.
    const c2Fail = advanceGo(c2State, spec, {
      [criticReportFileName("P2", 2)]: { kind: "ok", data: okCritic("P2", 2, "FAIL") },
    });
    assert.deepEqual(c2Fail.state.failedPieces, ["P2"]);
    assert.deepEqual(c2Fail.state.phase, { kind: "building", pieces: ["P3"] });
  });
});

describe("advanceGo — auditing, relay, stop, and idempotency", () => {
  it("retries missing/invalid audit once and stops on second miss with runDir and issues", () => {
    const spec = makeSpec({ builtPieces: ["P1", "P2", "P3"] });
    const auditState = makeState({ phase: { kind: "auditing" } });

    const invalidAudit = {
      ...okAudit(["P1", "P2", "P3"]),
      // Missing P3 in pieces fails validateGoAudit.
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "done" },
      ],
    };
    const reports: ReportsOnDisk = {
      [AUDIT_REPORT_FILE_NAME]: { kind: "ok", data: invalidAudit },
    };

    const retry = advanceGo(auditState, spec, reports);
    assert.equal(retry.state.retries.audit, 1);
    assert.deepEqual(retry.state.phase, { kind: "auditing" });
    assert.equal(retry.action.action, "spawn");

    const stop = advanceGo(retry.state, spec, reports);
    assert.equal(stop.state.phase.kind, "stopped");
    assert.equal(stop.action.action, "stop");
    if (stop.action.action !== "stop") {
      return;
    }
    assert.ok(stop.action.reason.includes(RUN_DIR));
    assert.ok(stop.action.details !== undefined && stop.action.details.length > 0);
    assert.ok(stop.action.details.some((line) => line.includes("P3")));

    // Stopped is idempotent on repeat calls.
    const repeatStop = advanceGo(stop.state, spec, reports);
    assert.deepEqual(repeatStop.action, stop.action);
    assert.deepEqual(repeatStop.state, stop.state);
  });

  it("replaces specBuiltPieces, renders report.md, emits relay, and is idempotent when done", () => {
    const spec = makeSpec({ builtPieces: ["P1", "P2", "P3"] });
    const auditState = makeState({ phase: { kind: "auditing" } });
    // Auditor downgraded P3 to not-done -> builtPieces should be replaced with ["P1", "P2"].
    const auditReport = okAudit(["P1", "P2"]);

    const doneRes = advanceGo(auditState, spec, {
      [AUDIT_REPORT_FILE_NAME]: { kind: "ok", data: auditReport },
    });
    const expectedReportPath = path.join(RUN_DIR, "report.md");
    assert.deepEqual(doneRes.state.phase, { kind: "done", reportPath: expectedReportPath });
    assert.deepEqual(doneRes.action, { action: "relay", report: expectedReportPath });
    assert.deepEqual(doneRes.specBuiltPieces, ["P1", "P2"]);
    assert.equal(doneRes.renderedReportMd, renderGoAudit(auditReport));

    // Repeated next after done is idempotent and performs no further updates.
    const repeatRes = advanceGo(doneRes.state, spec, {});
    assert.deepEqual(repeatRes.state, doneRes.state);
    assert.deepEqual(repeatRes.action, { action: "relay", report: expectedReportPath });
    assert.equal(repeatRes.specBuiltPieces, undefined);
    assert.equal(repeatRes.renderedReportMd, undefined);
  });
});
