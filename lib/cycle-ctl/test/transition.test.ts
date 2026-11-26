import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import YAML from "yaml";
import type { Spec } from "../../contracts/src/spec-schema.ts";
import { buildReviewBrief } from "../src/briefs.ts";
import type { CycleState } from "../src/state.ts";
import {
  advanceCycle,
  parseGateLog,
  type CycleAdvanceEnv,
  type RawReportEntry,
} from "../src/transition.ts";

const makeSpec = (): Spec => ({
  title: "Cycle CLI",
  status: "building",
  intent: "Deterministic /cycle CLI.",
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
  builtPieces: ["P1"],
  pieces: [
    {
      id: "P1",
      name: "Core",
      owns: ["src/a.ts"],
      after: [],
      now: "None.",
      reuse: "Contracts.",
      change: "Add core.",
      proof: "pnpm test",
    },
  ],
  invariantsAndDocs: [],
  doneMeans: [{ cmd: "pnpm test", proves: "Tests pass." }],
  onlyUserCan: [],
  outOfScope: [],
  parked: [],
});

const makeBaseState = (overrides: Partial<CycleState> = {}): CycleState => ({
  specPath: "/repo/.plans/spec-test.yaml",
  mode: "diff",
  mainDir: "/repo",
  repoRoot: "/repo",
  skillDir: "/skills/cycle",
  runDir: "/repo/.plans/scratch/cycle-20261123-120000",
  round: 1,
  phase: { kind: "review_ready" },
  slices: { "1": ["src/a.ts"] },
  stackFiles: { backend: ["stack-backend-1.txt"], frontend: [] },
  retries: {},
  committedLists: [],
  missedReports: [],
  ...overrides,
});

const makeEnv = (overrides: Partial<CycleAdvanceEnv> = {}): CycleAdvanceEnv => ({
  spec: makeSpec(),
  scope: ["src/a.ts"],
  leftOut: [],
  uncommitted: ["src/a.ts"],
  existingPaths: new Set(["src/a.ts"]),
  slicesYaml: { exists: false },
  reports: new Map<string, RawReportEntry>(),
  reviewFindingsForAudit: [],
  gateLog: null,
  ...overrides,
});

const cleanReview = (): Record<string, unknown> => ({
  findings: [],
  filesRead: [{ path: "src/a.ts", mode: "full" }],
});

const cleanDoctrineReview = (): Record<string, unknown> => ({
  findings: [],
  filesRead: [{ path: "src/a.ts", mode: "full" }],
  machinery: [],
});

const fixReview = (file = "src/a.ts"): Record<string, unknown> => ({
  findings: [
    {
      id: "F1",
      file,
      line: 10,
      problem: "Bug.",
      harm: "Breaks caller.",
      fix: "Guard null.",
      files: [file],
      do: "fix",
    },
  ],
  filesRead: [{ path: file, mode: "full" }],
});

const validFixReport = (
  report = "review-1-slice-1.yaml",
  changedFiles = ["src/a.ts"],
): Record<string, unknown> => ({
  results: [
    {
      findingId: "F1",
      report,
      status: "FIXED",
      change: "Added null guard in src/a.ts.",
    },
  ],
  changedFiles,
  notRun: [],
});

const validCriticReport = (verdict: "PASS" | "FAIL"): Record<string, unknown> => ({
  ran: [{ cmd: "pnpm test", exit: 0 }],
  notRun: [],
  findings: [
    {
      findingId: "F1",
      report: "review-1-slice-1.yaml",
      verdict: verdict === "PASS" ? "FIXED" : "STILL_THERE",
      detail: verdict === "PASS" ? "Verified fix." : "Null path still fails.",
    },
  ],
  missing: [],
  extra: [],
  specBroken: [],
  verdict,
});

describe("parseGateLog", () => {
  it("recognizes pass, fail, none-named, unlisted, and malformed gate logs", () => {
    assert.deepEqual(parseGateLog("ok\nGATE EXIT 0\n"), { kind: "pass" });
    assert.deepEqual(parseGateLog("GATE: none named\n"), { kind: "pass" });
    assert.deepEqual(parseGateLog("GATE: task could not list Taskfile.yml\nerror\n"), {
      kind: "pass",
    });
    assert.deepEqual(parseGateLog("tests failed\nGATE EXIT 1\n"), { kind: "fail", exitCode: 1 });
    assert.deepEqual(parseGateLog("random output without sentinel\n"), { kind: "malformed" });
  });
});

describe("advanceCycle: slicing (> 15 paths)", () => {
  it("prompts for slices.yaml, re-prompts with errors on invalid input, and transitions to reviewing when valid", () => {
    const scope = Array.from({ length: 16 }, (_, i) => `src/f${i + 1}.ts`);
    const state0 = makeBaseState({
      phase: { kind: "await_slices", errors: [] },
      slices: {},
      stackFiles: { backend: [], frontend: [] },
    });

    const missingRes = advanceCycle(state0, makeEnv({ scope, slicesYaml: { exists: false } }));
    assert.equal(missingRes.action.action, "slice");
    assert.equal(missingRes.state.phase.kind, "await_slices");

    const invalidRes = advanceCycle(
      missingRes.state,
      makeEnv({
        scope,
        slicesYaml: {
          exists: true,
          raw: {
            slices: [{ id: 1, files: scope.slice(0, 10) }],
            stacks: { backend: [scope.slice(0, 10)], frontend: [] },
          },
        },
      }),
    );
    assert.equal(invalidRes.action.action, "slice");
    if (invalidRes.action.action === "slice") {
      assert.ok(invalidRes.action.errors.length > 0);
    }

    const validRes = advanceCycle(
      invalidRes.state,
      makeEnv({
        scope,
        slicesYaml: {
          exists: true,
          raw: {
            slices: [
              { id: 1, files: scope.slice(0, 8) },
              { id: 2, files: scope.slice(8) },
            ],
            stacks: {
              backend: [scope.slice(0, 16)],
              frontend: [],
            },
          },
        },
      }),
    );
    assert.equal(validRes.state.phase.kind, "reviewing");
    assert.equal(validRes.action.action, "spawn");
    if (validRes.action.action === "spawn") {
      assert.equal(validRes.action.parallel, true);
      assert.equal(validRes.action.subagents.length, 3);
    }
    assert.ok(validRes.effects.writeSlices !== undefined);
    assert.ok(validRes.effects.writeStackFiles !== undefined);
  });
});

describe("advanceCycle: 0-fix fast-path to gate", () => {
  it("runs reviews, commits work, and jumps straight to gate when there are 0 do: fix findings", () => {
    const step1 = advanceCycle(makeBaseState(), makeEnv());
    assert.equal(step1.state.phase.kind, "reviewing");
    assert.equal(step1.action.action, "spawn");
    if (step1.action.action === "spawn") {
      assert.equal(step1.action.parallel, true);
      assert.equal(step1.action.subagents.length, 2);
    }

    const reports = new Map<string, RawReportEntry>([
      ["review-1-slice-1.yaml", { exists: true, raw: cleanReview() }],
      ["review-1-backend-1.yaml", { exists: true, raw: cleanDoctrineReview() }],
    ]);

    const step2 = advanceCycle(step1.state, makeEnv({ reports }));
    assert.equal(step2.state.phase.kind, "commit_work");
    assert.equal(step2.action.action, "commit");
    if (step2.action.action === "commit") {
      assert.deepEqual(step2.action.changes, []);
      assert.match(step2.action.listFile, /scope\.txt$/);
    }

    // Before commit is recorded, next re-emits commit
    const step2Repeat = advanceCycle(step2.state, makeEnv({ reports }));
    assert.equal(step2Repeat.action.action, "commit");

    // Once scope.txt is recorded as committed, jumps to gate
    const committedState: CycleState = {
      ...step2.state,
      committedLists: ["scope.txt"],
    };
    const step3 = advanceCycle(committedState, makeEnv({ reports }));
    assert.equal(step3.state.phase.kind, "gate");
    assert.equal(step3.action.action, "gate");
  });
});

describe("advanceCycle: fix, critic PASS/FAIL, second attempt, and missed-twice", () => {
  it("runs fixer -> critic FAIL -> second fixer -> second critic (no third fixer) -> re-review -> commit_round", () => {
    const reports = new Map<string, RawReportEntry>([
      ["review-1-slice-1.yaml", { exists: true, raw: fixReview() }],
      ["review-1-backend-1.yaml", { exists: true, raw: cleanDoctrineReview() }],
    ]);
    const committedWork = makeBaseState({
      phase: { kind: "commit_work" },
      committedLists: ["scope.txt"],
    });

    // Starts fixing
    const fixStart = advanceCycle(committedWork, makeEnv({ reports }));
    assert.equal(fixStart.state.phase.kind, "fixing");
    assert.equal(fixStart.action.action, "spawn");

    // First fixer completes -> starts critic
    reports.set("fix-1-slice-1.yaml", { exists: true, raw: validFixReport() });
    const criticStart = advanceCycle(fixStart.state, makeEnv({ reports }));
    assert.equal(criticStart.state.phase.kind, "critiquing");
    assert.equal(criticStart.action.action, "spawn");
    if (criticStart.action.action === "spawn") {
      assert.equal(criticStart.action.parallel, false);
      assert.equal(criticStart.action.subagents[0]?.role, "critic");
    }

    // Critic FAIL -> spawns second fixer
    reports.set("critic-1-slice-1.yaml", { exists: true, raw: validCriticReport("FAIL") });
    const secondFixStart = advanceCycle(criticStart.state, makeEnv({ reports }));
    assert.equal(secondFixStart.state.phase.kind, "second_fixing");
    assert.equal(secondFixStart.action.action, "spawn");
    if (secondFixStart.action.action === "spawn") {
      assert.match(secondFixStart.action.subagents[0]?.report ?? "", /fix-1-slice-1-b\.yaml$/);
    }

    // Second fixer completes -> spawns second critic
    reports.set("fix-1-slice-1-b.yaml", { exists: true, raw: validFixReport() });
    const secondCriticStart = advanceCycle(secondFixStart.state, makeEnv({ reports }));
    assert.equal(secondCriticStart.state.phase.kind, "second_critiquing");
    assert.equal(secondCriticStart.action.action, "spawn");
    if (secondCriticStart.action.action === "spawn") {
      assert.match(
        secondCriticStart.action.subagents[0]?.report ?? "",
        /critic-1-slice-1-b\.yaml$/,
      );
    }

    // Second critic FAIL -> still proceeds to re-review (never a third fixer)
    reports.set("critic-1-slice-1-b.yaml", { exists: true, raw: validCriticReport("FAIL") });
    const rereviewStart = advanceCycle(secondCriticStart.state, makeEnv({ reports }));
    assert.equal(rereviewStart.state.phase.kind, "rereviewing");
    assert.equal(rereviewStart.action.action, "spawn");
    if (rereviewStart.action.action === "spawn") {
      assert.match(rereviewStart.action.subagents[0]?.brief ?? "", /Mode: fixes/);
    }

    // Re-review completes -> commit_round with extracted FIXED changes
    reports.set("review-2-fixes.yaml", { exists: true, raw: cleanReview() });
    const commitRound = advanceCycle(rereviewStart.state, makeEnv({ reports }));
    assert.equal(commitRound.state.phase.kind, "commit_round");
    assert.equal(commitRound.action.action, "commit");
    if (commitRound.action.action === "commit") {
      assert.equal(commitRound.action.changes.length, 2);
      assert.equal(commitRound.action.changes[0], "Added null guard in src/a.ts.");
    }
  });

  it("retries a missing critic once and spawns no second fixer when critic misses twice", () => {
    const reports = new Map<string, RawReportEntry>([
      ["review-1-slice-1.yaml", { exists: true, raw: fixReview() }],
      ["fix-1-slice-1.yaml", { exists: true, raw: validFixReport() }],
    ]);
    const critiquing = makeBaseState({
      phase: {
        kind: "critiquing",
        sliceIds: [1],
        currentIndex: 0,
        reviewReports: ["review-1-slice-1.yaml"],
        failedSliceIds: [],
      },
    });

    // First miss -> retry
    const retry = advanceCycle(critiquing, makeEnv({ reports }));
    assert.equal(retry.state.phase.kind, "critiquing");
    assert.equal(retry.state.retries["critic-1-slice-1.yaml"], 1);
    assert.equal(retry.action.action, "spawn");

    // Second miss -> recorded in missedReports, skips second_fixing, goes to rereviewing
    const afterSecondMiss = advanceCycle(retry.state, makeEnv({ reports }));
    assert.ok(afterSecondMiss.state.missedReports.includes("critic-1-slice-1.yaml"));
    assert.equal(afterSecondMiss.state.phase.kind, "rereviewing");
  });

  it("enforces the round cap at round 3 and transitions to gate", () => {
    const round3Committed = makeBaseState({
      round: 3,
      phase: { kind: "commit_round", fixedListFile: "fixed-3.txt" },
      committedLists: ["scope.txt", "fixed-1.txt", "fixed-2.txt", "fixed-3.txt"],
    });
    const reports = new Map<string, RawReportEntry>([
      ["review-4-fixes.yaml", { exists: true, raw: fixReview() }],
    ]);

    const res = advanceCycle(round3Committed, makeEnv({ reports }));
    assert.equal(res.state.phase.kind, "gate");
    assert.equal(res.action.action, "gate");
  });

  it("retries missing review once, records second miss, and omits missed fixer report from critic brief", () => {
    const reviewing = makeBaseState({
      phase: {
        kind: "reviewing",
        tasks: [
          {
            role: "reviewer",
            listFile: "slice-1.txt",
            reportFile: "review-1-slice-1.yaml",
          },
          {
            role: "doctrine-reviewer-backend",
            listFile: "stack-backend-1.txt",
            reportFile: "review-1-backend-1.yaml",
          },
        ],
      },
    });
    const partialReports = new Map<string, RawReportEntry>([
      ["review-1-slice-1.yaml", { exists: true, raw: fixReview() }],
    ]);

    // First miss on backend review -> retry only the missing review
    const retryReview = advanceCycle(reviewing, makeEnv({ reports: partialReports }));
    assert.equal(retryReview.state.phase.kind, "reviewing");
    assert.equal(retryReview.state.retries["review-1-backend-1.yaml"], 1);
    assert.equal(retryReview.action.action, "spawn");
    if (retryReview.action.action === "spawn") {
      assert.equal(retryReview.action.subagents.length, 1);
      assert.equal(retryReview.action.subagents[0]?.role, "doctrine-reviewer-backend");
    }

    // Second miss on backend review -> recorded in missedReports and advances to commit_work
    const afterSecondMiss = advanceCycle(retryReview.state, makeEnv({ reports: partialReports }));
    assert.ok(afterSecondMiss.state.missedReports.includes("review-1-backend-1.yaml"));
    assert.equal(afterSecondMiss.state.phase.kind, "commit_work");

    // Fixer misses twice -> critic brief omits fix-1-slice-1.yaml
    const fixing = makeBaseState({
      phase: {
        kind: "fixing",
        sliceIds: [1],
        reviewReports: ["review-1-slice-1.yaml"],
      },
    });
    const fixerRetry = advanceCycle(fixing, makeEnv({ reports: partialReports }));
    assert.equal(fixerRetry.state.retries["fix-1-slice-1.yaml"], 1);
    const fixerMissed = advanceCycle(fixerRetry.state, makeEnv({ reports: partialReports }));
    assert.ok(fixerMissed.state.missedReports.includes("fix-1-slice-1.yaml"));
    assert.equal(fixerMissed.state.phase.kind, "critiquing");
    assert.equal(fixerMissed.action.action, "spawn");
    if (fixerMissed.action.action === "spawn") {
      assert.doesNotMatch(fixerMissed.action.subagents[0]?.brief ?? "", /fix-1-slice-1\.yaml/);
    }
  });
});

describe("advanceCycle: gate and audit", () => {
  it("skips gate_fixing when gate.log is GATE: none named and skips commit_gate when fixed-gate.txt is empty", () => {
    const gateState = makeBaseState({ phase: { kind: "gate" } });
    const noneNamed = advanceCycle(gateState, makeEnv({ gateLog: "GATE: none named\n" }));
    assert.equal(noneNamed.state.phase.kind, "auditing");
    assert.equal(noneNamed.action.action, "spawn");

    const gateCritiquing = makeBaseState({ phase: { kind: "gate_critiquing" } });
    const reports = new Map<string, RawReportEntry>([
      ["fix-gate.yaml", { exists: true, raw: validFixReport("gate.log", []) }],
      ["critic-gate.yaml", { exists: true, raw: validCriticReport("PASS") }],
    ]);
    const emptyGateFix = advanceCycle(
      gateCritiquing,
      makeEnv({ reports, uncommitted: [], gateLog: "GATE EXIT 1\n" }),
    );
    assert.equal(emptyGateFix.state.phase.kind, "auditing");
    assert.equal(emptyGateFix.action.action, "spawn");
  });
  it("handles red gate with fix-once -> critic -> commit_gate -> auditing (never re-running gate)", () => {
    const gateState = makeBaseState({ phase: { kind: "gate" } });

    const redGate = advanceCycle(gateState, makeEnv({ gateLog: "FAIL\nGATE EXIT 1\n" }));
    assert.equal(redGate.state.phase.kind, "gate_fixing");
    assert.equal(redGate.action.action, "spawn");

    const reports = new Map<string, RawReportEntry>([
      ["fix-gate.yaml", { exists: true, raw: validFixReport("gate.log", ["src/a.ts"]) }],
    ]);
    const gateCritic = advanceCycle(redGate.state, makeEnv({ reports, gateLog: "GATE EXIT 1\n" }));
    assert.equal(gateCritic.state.phase.kind, "gate_critiquing");

    reports.set("critic-gate.yaml", { exists: true, raw: validCriticReport("PASS") });
    const commitGate = advanceCycle(
      gateCritic.state,
      makeEnv({ reports, uncommitted: ["src/a.ts"], gateLog: "GATE EXIT 1\n" }),
    );
    assert.equal(commitGate.state.phase.kind, "commit_gate");
    assert.equal(commitGate.action.action, "commit");

    const committedGate: CycleState = {
      ...commitGate.state,
      committedLists: ["fixed-gate.txt"],
    };
    const toAudit = advanceCycle(committedGate, makeEnv({ reports, gateLog: "GATE EXIT 1\n" }));
    assert.equal(toAudit.state.phase.kind, "auditing");
    assert.equal(toAudit.action.action, "spawn");
  });

  it("stops on malformed gate.log", () => {
    const gateState = makeBaseState({ phase: { kind: "gate" } });
    const res = advanceCycle(gateState, makeEnv({ gateLog: "no sentinel here\n" }));
    assert.equal(res.state.phase.kind, "stopped");
    assert.equal(res.action.action, "stop");
  });

  it("retries invalid audit once, updates spec + renders report.md on valid audit, and is idempotent when done", () => {
    const auditState = makeBaseState({ phase: { kind: "auditing" } });

    // Missing audit -> retry once
    const retry = advanceCycle(auditState, makeEnv());
    assert.equal(retry.state.phase.kind, "auditing");
    assert.equal(retry.state.retries["audit.yaml"], 1);
    assert.equal(retry.action.action, "spawn");

    // Second miss -> stop
    const stopped = advanceCycle(retry.state, makeEnv());
    assert.equal(stopped.state.phase.kind, "stopped");
    assert.equal(stopped.action.action, "stop");

    // Valid audit from auditing state -> done + relay + spec update + renderReport
    const validAudit = {
      tldr: "All clean and built.",
      findings: [],
      needsFromYou: [],
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "pnpm test", exit: 0, pieces: ["P1"] }],
      notChecked: [],
      parked: [],
      builtPieces: ["P1"],
      commits: [{ sha: "abc1234", subject: "feat(core): add core", bullets: [] }],
      fixed: [],
      notAHarm: [],
      notFixed: [],
      gate: "green",
      specStatus: { status: "built" },
    };
    const reports = new Map<string, RawReportEntry>([
      ["audit.yaml", { exists: true, raw: validAudit }],
    ]);
    const doneRes = advanceCycle(auditState, makeEnv({ reports }));
    assert.equal(doneRes.state.phase.kind, "done");
    assert.equal(doneRes.action.action, "relay");
    assert.deepEqual(doneRes.effects.updateSpec, { builtPieces: ["P1"], status: "built" });
    assert.ok(doneRes.effects.renderReport !== undefined);
    assert.match(doneRes.effects.renderReport.markdown, /\*\*Spec:\*\* built/);

    // Idempotent once done
    const replay = advanceCycle(doneRes.state, makeEnv({ reports }));
    assert.equal(replay.state.phase.kind, "done");
    assert.equal(replay.action.action, "relay");
    assert.deepEqual(replay.effects, {});
  });
});

describe("spec-blind doctrine briefs, doctrine report validation, audit machinery, and CLI line budget", () => {
  it("buildReviewBrief emits Spec: none for doctrine reviewers and keeps Spec: <path> for reviewer", () => {
    const state = makeBaseState({ specPath: "/repo/.plans/spec-test.yaml" });

    const sliceBrief = buildReviewBrief(state, "reviewer", "slice-1.txt", "review-1-slice-1.yaml");
    assert.match(sliceBrief, /^Spec: \/repo\/\.plans\/spec-test\.yaml$/m);

    const backendBrief = buildReviewBrief(
      state,
      "doctrine-reviewer-backend",
      "stack-backend-1.txt",
      "review-1-backend-1.yaml",
    );
    assert.match(backendBrief, /^Spec: none$/m);
    assert.doesNotMatch(backendBrief, /spec-test\.yaml/);

    const frontendBrief = buildReviewBrief(
      state,
      "doctrine-reviewer-frontend",
      "stack-frontend-1.txt",
      "review-1-frontend-1.yaml",
    );
    assert.match(frontendBrief, /^Spec: none$/m);
    assert.doesNotMatch(frontendBrief, /spec-test\.yaml/);
  });

  it("retries invalid doctrine reports (missing machinery or broken findingId) and accepts valid ones", () => {
    const reviewing = makeBaseState({
      phase: {
        kind: "reviewing",
        tasks: [
          {
            role: "reviewer",
            listFile: "slice-1.txt",
            reportFile: "review-1-slice-1.yaml",
          },
          {
            role: "doctrine-reviewer-backend",
            listFile: "stack-backend-1.txt",
            reportFile: "review-1-backend-1.yaml",
          },
        ],
      },
    });

    // Missing machinery field -> retries backend reviewer
    const missingMachinery = new Map<string, RawReportEntry>([
      ["review-1-slice-1.yaml", { exists: true, raw: cleanReview() }],
      ["review-1-backend-1.yaml", { exists: true, raw: cleanReview() }],
    ]);
    const retryMissing = advanceCycle(reviewing, makeEnv({ reports: missingMachinery }));
    assert.equal(retryMissing.state.phase.kind, "reviewing");
    assert.equal(retryMissing.state.retries["review-1-backend-1.yaml"], 1);
    assert.equal(retryMissing.action.action, "spawn");
    if (retryMissing.action.action === "spawn") {
      assert.equal(retryMissing.action.subagents.length, 1);
      assert.equal(retryMissing.action.subagents[0]?.role, "doctrine-reviewer-backend");
      assert.match(retryMissing.action.subagents[0]?.brief ?? "", /^Spec: none$/m);
    }

    // Broken machinery entry referencing unknown findingId -> retries backend reviewer
    const badBrokenRef = new Map<string, RawReportEntry>([
      ["review-1-slice-1.yaml", { exists: true, raw: cleanReview() }],
      [
        "review-1-backend-1.yaml",
        {
          exists: true,
          raw: {
            findings: [],
            filesRead: [{ path: "src/a.ts", mode: "full" }],
            machinery: [
              {
                file: "src/a.ts",
                symbol: "CustomValidator",
                status: "broken",
                findingId: "F99",
              },
            ],
          },
        },
      ],
    ]);
    const retryBroken = advanceCycle(reviewing, makeEnv({ reports: badBrokenRef }));
    assert.equal(retryBroken.state.phase.kind, "reviewing");
    assert.equal(retryBroken.state.retries["review-1-backend-1.yaml"], 1);

    // Valid doctrine report with broken machinery + matching library Law finding -> advances to commit_work, then fixing
    const validReports = new Map<string, RawReportEntry>([
      ["review-1-slice-1.yaml", { exists: true, raw: cleanReview() }],
      [
        "review-1-backend-1.yaml",
        {
          exists: true,
          raw: {
            findings: [
              {
                id: "F1",
                file: "src/a.ts",
                line: 12,
                rule: "coding/use-a-maintained-library-before-building-machinery.md",
                problem: "Hand-rolled schema validator.",
                harm: "Reimplements maintained library.",
                fix: "Replace with maintained validator.",
                files: ["src/a.ts"],
                do: "fix",
              },
            ],
            filesRead: [{ path: "src/a.ts", mode: "full" }],
            machinery: [
              {
                file: "src/a.ts",
                symbol: "CustomValidator",
                status: "broken",
                findingId: "F1",
              },
            ],
          },
        },
      ],
    ]);
    const accepted = advanceCycle(reviewing, makeEnv({ reports: validReports }));
    assert.equal(accepted.state.phase.kind, "commit_work");

    const committed: CycleState = { ...accepted.state, committedLists: ["scope.txt"] };
    const toFixing = advanceCycle(committed, makeEnv({ reports: validReports }));
    assert.equal(toFixing.state.phase.kind, "fixing");
    assert.equal(toFixing.action.action, "spawn");
  });

  it("cli.ts init and next enter action: slice with fileLines and maxLinesPerList: 3500 when multi-file changes exceed 3,500 lines", () => {
    const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), "cycle-cli-budget-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: tmpRepo });
      execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: tmpRepo });
      execFileSync("git", ["config", "user.name", "Test User"], { cwd: tmpRepo });
      fs.writeFileSync(path.join(tmpRepo, "README.md"), "# init\n", "utf8");
      execFileSync("git", ["add", "README.md"], { cwd: tmpRepo });
      execFileSync("git", ["commit", "-q", "-m", "chore: init"], { cwd: tmpRepo });

      fs.mkdirSync(path.join(tmpRepo, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(tmpRepo, "src/big-a.ts"),
        `${Array.from({ length: 2000 }, (_, i) => `export const a${i} = ${i};`).join("\n")}\n`,
        "utf8",
      );
      fs.writeFileSync(
        path.join(tmpRepo, "src/big-b.ts"),
        `${Array.from({ length: 1600 }, (_, i) => `export const b${i} = ${i};`).join("\n")}\n`,
        "utf8",
      );

      const cliPath = path.resolve(import.meta.dirname, "../src/cli.ts");
      const initOut = execFileSync(process.execPath, [cliPath, "init"], {
        cwd: tmpRepo,
        encoding: "utf8",
      });
      const initParsed: unknown = YAML.parse(initOut);
      assert.ok(
        typeof initParsed === "object" &&
          initParsed !== null &&
          "run" in initParsed &&
          typeof initParsed.run === "string",
      );

      const nextOut = execFileSync(process.execPath, [cliPath, "next", initParsed.run], {
        cwd: tmpRepo,
        encoding: "utf8",
      });
      const nextParsed: unknown = YAML.parse(nextOut);
      assert.ok(typeof nextParsed === "object" && nextParsed !== null);
      assert.equal("action" in nextParsed ? nextParsed.action : undefined, "slice");
      assert.deepEqual("fileLines" in nextParsed ? nextParsed.fileLines : undefined, {
        "src/big-a.ts": 2000,
        "src/big-b.ts": 1600,
      });
      const schema = "schema" in nextParsed ? nextParsed.schema : undefined;
      assert.ok(typeof schema === "object" && schema !== null);
      assert.equal("maxLinesPerList" in schema ? schema.maxLinesPerList : undefined, 3500);
    } finally {
      fs.rmSync(tmpRepo, { recursive: true, force: true });
    }
  });
});
