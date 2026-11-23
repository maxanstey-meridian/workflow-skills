import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BuildReportSchema,
  ColdReadReportSchema,
  CycleAuditReportSchema,
  CycleCriticReportSchema,
  FixReportSchema,
  GoAuditReportSchema,
  GoCriticReportSchema,
  ReviewReportSchema,
} from "../src/report-schemas.ts";
import type {
  ColdReadReport,
  CycleAuditReport,
  CycleCriticReport,
  GoAuditReport,
  GoCriticReport,
  ReviewReport,
} from "../src/report-schemas.ts";
import {
  countReviewFixes,
  validateColdRead,
  validateCycleAudit,
  validateCycleCritic,
  validateGoAudit,
  validateGoCritic,
} from "../src/report-validate.ts";
import { SpecSchema } from "../src/spec-schema.ts";
import type { Spec } from "../src/spec-schema.ts";

const makeSpec = (): Spec =>
  SpecSchema.parse({
    title: "Pipeline contracts",
    status: "building",
    intent: "Validate inter-stage YAML artifacts.",
    decisions: [
      {
        id: "D1",
        title: "Strict schemas",
        what: "Reject unknown keys.",
        why: "Catch typos.",
        decidedBy: "agreed",
      },
      {
        id: "D2",
        title: "Pure validators",
        what: "Keep validators free of I/O.",
        why: "Easy direct testing.",
        decidedBy: "agreed",
      },
    ],
    pieces: [
      {
        id: "P1",
        name: "Schemas",
        owns: ["src/a.ts"],
        after: [],
        now: "Missing.",
        reuse: "zod.",
        change: "Add schemas.",
        proof: "pnpm test",
      },
      {
        id: "P2",
        name: "Validators",
        owns: ["src/b.ts"],
        after: ["P1"],
        now: "Missing.",
        reuse: "zod.",
        change: "Add validators.",
        proof: "pnpm test",
      },
    ],
    doneMeans: [
      { cmd: "pnpm test", proves: "Unit tests pass." },
      { cmd: "pnpm lint", proves: "Linter passes." },
    ],
  });

const makeGoAudit = (overrides: Partial<GoAuditReport> = {}): GoAuditReport =>
  GoAuditReportSchema.parse({
    tldr: "Built P1 and P2.",
    pieces: [
      { id: "P1", status: "done" },
      { id: "P2", status: "done" },
    ],
    decisions: [
      { id: "D1", status: "honoured" },
      { id: "D2", status: "honoured" },
    ],
    checked: [
      { cmd: "pnpm test", exit: 0, pieces: ["P1", "P2"] },
      { cmd: "pnpm lint", exit: 0 },
    ],
    builtPieces: ["P1", "P2"],
    ...overrides,
  });

const makeCycleAudit = (overrides: Partial<CycleAuditReport> = {}): CycleAuditReport =>
  CycleAuditReportSchema.parse({
    tldr: "Reviewed and fixed all findings.",
    pieces: [
      { id: "P1", status: "done" },
      { id: "P2", status: "done" },
    ],
    decisions: [
      { id: "D1", status: "honoured" },
      { id: "D2", status: "honoured" },
    ],
    checked: [
      { cmd: "pnpm test", exit: 0, pieces: ["P1", "P2"] },
      { cmd: "pnpm lint", exit: 0 },
    ],
    builtPieces: ["P1", "P2"],
    commits: [{ sha: "abc1234", subject: "feat(contracts): add report schemas" }],
    gate: "green",
    specStatus: { status: "built" },
    ...overrides,
  });

describe("report schemas", () => {
  it("parses valid reports and rejects unknown keys and invalid variants across all eight schemas", () => {
    const coldRead = ColdReadReportSchema.safeParse({
      findings: [
        {
          section: "Decisions",
          quote: "Skip index",
          detail: "Breaks uniqueness law.",
          file: "src/a.ts",
          symbol: "save",
        },
      ],
      laws: [
        { decisionId: "D1", status: "kept", lawPath: "coding/a.md", keptBy: "strict()" },
        { decisionId: "D2", status: "broken", lawPath: "coding/b.md", findingIndex: 1 },
      ],
    });
    assert.equal(coldRead.success, true);
    assert.equal(
      ColdReadReportSchema.safeParse({
        laws: [{ decisionId: "D1", status: "none-bears", lawPath: "extra" }],
      }).success,
      false,
    );

    const buildBuilt = BuildReportSchema.safeParse({
      piece: "P1",
      attempt: 1,
      result: "BUILT",
      changed: [{ path: "src/a.ts", summary: "Created schemas." }],
      decisionsBuilt: [{ id: "D1", summary: "Added .strict()." }],
      ran: [{ cmd: "pnpm test", exit: 0 }],
    });
    assert.equal(buildBuilt.success, true);

    const buildStopped = BuildReportSchema.safeParse({
      piece: "P1",
      attempt: 2,
      result: "STOPPED",
      stopReason: "Spec has an open ask.",
    });
    assert.equal(buildStopped.success, true);
    assert.equal(
      BuildReportSchema.safeParse({ piece: "P1", attempt: 1, result: "STOPPED" }).success,
      false,
    );
    assert.equal(
      BuildReportSchema.safeParse({
        piece: "P1",
        attempt: 1,
        result: "BUILT",
        stopReason: "not allowed",
      }).success,
      false,
    );
    assert.equal(
      BuildReportSchema.safeParse({ piece: "P1", attempt: 3, result: "BUILT" }).success,
      false,
    );

    const goCritic = GoCriticReportSchema.safeParse({
      piece: "P1",
      attempt: 1,
      verdict: "PASS",
    });
    assert.equal(goCritic.success, true);
    assert.equal(
      GoCriticReportSchema.safeParse({
        piece: "P1",
        attempt: 1,
        verdict: "PASS",
        extraField: true,
      }).success,
      false,
    );

    const review = ReviewReportSchema.safeParse({
      findings: [
        {
          id: "F1",
          file: "src/a.ts",
          line: 12,
          rule: "coding/fix-a-gap",
          problem: "Missing check.",
          harm: "Invalid data passes.",
          fix: "Add check.",
          files: ["src/a.ts"],
          do: "fix",
        },
      ],
      filesRead: [{ path: "src/a.ts", mode: "full" }],
    });
    assert.equal(review.success, true);
    assert.equal(
      ReviewReportSchema.safeParse({
        findings: [],
        filesRead: [{ path: "src/a.ts", mode: "diff" }],
        toFix: 0,
      }).success,
      false,
    );
    assert.equal(ReviewReportSchema.safeParse({ findings: [], filesRead: [] }).success, false);

    const fix = FixReportSchema.safeParse({
      results: [
        {
          findingId: "F1",
          report: "review-1.yaml",
          status: "FIXED",
          change: "Added check.",
          check: "pnpm test",
        },
        {
          findingId: "F2",
          report: "review-1.yaml",
          status: "NOT_FOUND",
          read: "src/a.ts",
        },
        {
          findingId: "F3",
          report: "review-1.yaml",
          status: "NEEDS_CALL",
          read: "src/a.ts",
          options: ["Option A", "Option B"],
        },
        {
          findingId: "F4",
          report: "review-1.yaml",
          status: "OUT_OF_SLICE",
          read: "src/a.ts",
          outsideSlice: ["src/c.ts"],
        },
      ],
      changedFiles: ["src/a.ts"],
    });
    assert.equal(fix.success, true);
    assert.equal(
      FixReportSchema.safeParse({
        results: [
          {
            findingId: "F3",
            report: "review-1.yaml",
            status: "NEEDS_CALL",
            read: "src/a.ts",
            options: [],
          },
        ],
      }).success,
      false,
    );

    const cycleCritic = CycleCriticReportSchema.safeParse({
      findings: [
        {
          findingId: "F1",
          report: "review-1.yaml",
          verdict: "FIXED",
          detail: "Verified.",
        },
      ],
      specBroken: [
        {
          findingId: "F2",
          report: "review-1.yaml",
          quote: "Must be strict.",
          location: "Decisions D1",
        },
      ],
      verdict: "FAIL",
    });
    assert.equal(cycleCritic.success, true);
    assert.equal(CycleCriticReportSchema.safeParse({ verdict: "PASS", unknown: 1 }).success, false);

    assert.equal(
      GoAuditReportSchema.safeParse({
        tldr: "Done.",
        pieces: [],
      }).success,
      false,
    );
    assert.equal(
      GoAuditReportSchema.safeParse({
        ...makeGoAudit(),
        unexpected: "nope",
      }).success,
      false,
    );

    assert.equal(
      CycleAuditReportSchema.safeParse({
        ...makeCycleAudit(),
        specStatus: { status: "building" },
      }).success,
      false,
    );
    assert.equal(
      CycleAuditReportSchema.safeParse({
        ...makeCycleAudit(),
        specStatus: { status: "built", remaining: "none" },
      }).success,
      false,
    );
  });
});

describe("countReviewFixes", () => {
  it("counts only findings with do === fix", () => {
    const report: ReviewReport = ReviewReportSchema.parse({
      findings: [
        {
          id: "F1",
          file: "src/a.ts",
          line: 1,
          problem: "p",
          harm: "h",
          fix: "f",
          files: ["src/a.ts"],
          do: "fix",
        },
        {
          id: "F2",
          file: "src/a.ts",
          line: 2,
          problem: "p",
          harm: "h",
          fix: "f",
          files: ["src/a.ts"],
          do: "park",
        },
        {
          id: "F3",
          file: "src/a.ts",
          line: 3,
          problem: "p",
          harm: "h",
          fix: "f",
          files: ["src/a.ts"],
          do: "ask",
        },
        {
          id: "F4",
          file: "src/a.ts",
          line: 4,
          problem: "p",
          harm: "h",
          fix: "f",
          files: ["src/a.ts"],
          do: "nit",
        },
        {
          id: "F5",
          file: "src/a.ts",
          line: 5,
          problem: "p",
          harm: "h",
          fix: "f",
          files: ["src/a.ts"],
          do: "fix",
        },
      ],
      filesRead: [{ path: "src/a.ts", mode: "full" }],
    });
    assert.equal(countReviewFixes(report), 2);

    const empty = ReviewReportSchema.parse({
      findings: [],
      filesRead: [{ path: "src/a.ts", mode: "diff" }],
    });
    assert.equal(countReviewFixes(empty), 0);
  });
});

describe("validateColdRead", () => {
  it("accepts a cold read covering all spec decisions with valid findingIndex", () => {
    const spec = makeSpec();
    const report: ColdReadReport = ColdReadReportSchema.parse({
      findings: [{ section: "Decisions", quote: "Pure", detail: "Imports fs." }],
      laws: [
        { decisionId: "D1", status: "none-bears" },
        { decisionId: "D2", status: "broken", lawPath: "backend/pure.md", findingIndex: 1 },
      ],
    });
    assert.deepEqual(validateColdRead(report, spec), []);
  });

  it("rejects missing, duplicate, and unknown decisions and out-of-range findingIndex", () => {
    const spec = makeSpec();

    const missing = ColdReadReportSchema.parse({
      laws: [{ decisionId: "D1", status: "none-bears" }],
    });
    const missingIssues = validateColdRead(missing, spec);
    assert.equal(missingIssues.length, 1);
    assert.match(missingIssues[0]?.message ?? "", /missing law check for spec decision "D2"/);

    const duplicate = ColdReadReportSchema.parse({
      laws: [
        { decisionId: "D1", status: "none-bears" },
        { decisionId: "D1", status: "none-bears" },
        { decisionId: "D2", status: "none-bears" },
      ],
    });
    const dupIssues = validateColdRead(duplicate, spec);
    assert.equal(dupIssues.length, 1);
    assert.match(dupIssues[0]?.message ?? "", /duplicate law check for decision ID "D1"/);

    const unknown = ColdReadReportSchema.parse({
      laws: [
        { decisionId: "D1", status: "none-bears" },
        { decisionId: "D2", status: "none-bears" },
        { decisionId: "D9", status: "none-bears" },
      ],
    });
    const unknownIssues = validateColdRead(unknown, spec);
    assert.equal(unknownIssues.length, 1);
    assert.match(unknownIssues[0]?.message ?? "", /unknown decision ID "D9"/);

    const outOfRange = ColdReadReportSchema.parse({
      findings: [],
      laws: [
        { decisionId: "D1", status: "none-bears" },
        { decisionId: "D2", status: "broken", lawPath: "coding/a.md", findingIndex: 1 },
      ],
    });
    const rangeIssues = validateColdRead(outOfRange, spec);
    assert.equal(rangeIssues.length, 1);
    assert.equal(rangeIssues[0]?.path, "laws[1].findingIndex");
    assert.match(rangeIssues[0]?.message ?? "", /out of range/);
  });
});

describe("validateGoCritic", () => {
  it("accepts clean PASS and non-empty FAIL reports", () => {
    const pass: GoCriticReport = GoCriticReportSchema.parse({
      piece: "P1",
      attempt: 1,
      ran: [{ cmd: "pnpm test", exit: 0 }],
      verdict: "PASS",
    });
    assert.deepEqual(validateGoCritic(pass), []);

    const fail: GoCriticReport = GoCriticReportSchema.parse({
      piece: "P1",
      attempt: 1,
      ran: [{ cmd: "pnpm test", exit: 1 }],
      missing: ["Missing edge test."],
      verdict: "FAIL",
    });
    assert.deepEqual(validateGoCritic(fail), []);
  });

  it("refuses PASS when any finding list is non-empty or any ran command exited non-zero", () => {
    const fields = ["missing", "extra", "misunderstood", "shrunkCheck", "unproven"] as const;
    for (const field of fields) {
      const report = GoCriticReportSchema.parse({
        piece: "P1",
        attempt: 1,
        [field]: ["Found an issue."],
        verdict: "PASS",
      });
      const issues = validateGoCritic(report);
      assert.equal(issues.length, 1);
      assert.equal(issues[0]?.path, field);
      assert.match(issues[0]?.message ?? "", /PASS/);
    }

    const failedCmd = GoCriticReportSchema.parse({
      piece: "P1",
      attempt: 1,
      ran: [{ cmd: "pnpm test", exit: 1 }],
      verdict: "PASS",
    });
    const cmdIssues = validateGoCritic(failedCmd);
    assert.equal(cmdIssues.length, 1);
    assert.equal(cmdIssues[0]?.path, "ran[0].exit");
    assert.match(cmdIssues[0]?.message ?? "", /exited 1/);
  });
});

describe("validateCycleCritic", () => {
  it("accepts clean PASS and failing FAIL reports", () => {
    const pass: CycleCriticReport = CycleCriticReportSchema.parse({
      ran: [{ cmd: "pnpm test", exit: 0 }],
      findings: [
        { findingId: "F1", report: "review-1.yaml", verdict: "FIXED", detail: "Done." },
        {
          findingId: "F2",
          report: "review-1.yaml",
          verdict: "NOT_FOUND_AGREED",
          detail: "Agreed.",
        },
      ],
      verdict: "PASS",
    });
    assert.deepEqual(validateCycleCritic(pass), []);

    const fail: CycleCriticReport = CycleCriticReportSchema.parse({
      ran: [{ cmd: "pnpm test", exit: 1 }],
      findings: [
        {
          findingId: "F1",
          report: "review-1.yaml",
          verdict: "STILL_THERE",
          detail: "Still broken.",
        },
      ],
      missing: ["Unfixed item."],
      verdict: "FAIL",
    });
    assert.deepEqual(validateCycleCritic(fail), []);
  });

  it("refuses PASS on non-zero ran exit, failing finding verdicts, or non-empty missing/extra/specBroken", () => {
    const failedCmd = CycleCriticReportSchema.parse({
      ran: [{ cmd: "pnpm test", exit: 2 }],
      verdict: "PASS",
    });
    assert.equal(validateCycleCritic(failedCmd).length, 1);

    const failingVerdicts = ["STILL_THERE", "NOT_A_HARM", "EXTRA", "WRONG", "MISSING"] as const;
    for (const findingVerdict of failingVerdicts) {
      const report = CycleCriticReportSchema.parse({
        findings: [
          {
            findingId: "F1",
            report: "review-1.yaml",
            verdict: findingVerdict,
            detail: "Problem.",
          },
        ],
        verdict: "PASS",
      });
      const issues = validateCycleCritic(report);
      assert.equal(issues.length, 1);
      assert.equal(issues[0]?.path, "findings[0].verdict");
      assert.match(issues[0]?.message ?? "", new RegExp(findingVerdict));
    }

    const withMissing = CycleCriticReportSchema.parse({ missing: ["Item."], verdict: "PASS" });
    assert.equal(validateCycleCritic(withMissing)[0]?.path, "missing");

    const withExtra = CycleCriticReportSchema.parse({ extra: ["Scope creep."], verdict: "PASS" });
    assert.equal(validateCycleCritic(withExtra)[0]?.path, "extra");

    const withSpecBroken = CycleCriticReportSchema.parse({
      specBroken: [{ findingId: "F1", report: "review-1.yaml", quote: "Strict", location: "D1" }],
      verdict: "PASS",
    });
    assert.equal(validateCycleCritic(withSpecBroken)[0]?.path, "specBroken");
  });
});

describe("validateGoAudit", () => {
  it("accepts a complete go audit, including doneMeans accounted for in notChecked", () => {
    const spec = makeSpec();
    assert.deepEqual(validateGoAudit(makeGoAudit(), spec), []);

    const withNotChecked = makeGoAudit({
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "not-done", note: "Tests failed." },
      ],
      checked: [{ cmd: "pnpm test", exit: 1, pieces: ["P2"] }],
      notChecked: [{ check: "pnpm lint", reason: "Stopped after test failure." }],
      builtPieces: ["P1"],
    });
    assert.deepEqual(validateGoAudit(withNotChecked, spec), []);
  });

  it("rejects omitted/duplicate/unknown pieces and decisions, missing doneMeans, builtPieces drift, and done pieces with failing covering commands", () => {
    const spec = makeSpec();

    const missingPiece = makeGoAudit({
      pieces: [{ id: "P1", status: "done" }],
      builtPieces: ["P1"],
    });
    assert.match(validateGoAudit(missingPiece, spec)[0]?.message ?? "", /missing spec piece "P2"/);

    const dupPiece = makeGoAudit({
      pieces: [
        { id: "P1", status: "done" },
        { id: "P1", status: "done" },
        { id: "P2", status: "done" },
      ],
    });
    assert.match(validateGoAudit(dupPiece, spec)[0]?.message ?? "", /duplicate piece ID "P1"/);

    const unknownPiece = makeGoAudit({
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "done" },
        { id: "P9", status: "not-done" },
      ],
    });
    assert.match(validateGoAudit(unknownPiece, spec)[0]?.message ?? "", /unknown piece ID "P9"/);

    const missingDecision = makeGoAudit({
      decisions: [{ id: "D1", status: "honoured" }],
    });
    assert.match(
      validateGoAudit(missingDecision, spec)[0]?.message ?? "",
      /missing spec decision "D2"/,
    );

    const dupDecision = makeGoAudit({
      decisions: [
        { id: "D1", status: "honoured" },
        { id: "D1", status: "honoured" },
        { id: "D2", status: "honoured" },
      ],
    });
    assert.match(
      validateGoAudit(dupDecision, spec)[0]?.message ?? "",
      /duplicate decision ID "D1"/,
    );

    const unknownDecision = makeGoAudit({
      decisions: [
        { id: "D1", status: "honoured" },
        { id: "D2", status: "honoured" },
        { id: "D9", status: "honoured" },
      ],
    });
    assert.match(
      validateGoAudit(unknownDecision, spec)[0]?.message ?? "",
      /unknown decision ID "D9"/,
    );

    const missingDoneMean = makeGoAudit({
      checked: [{ cmd: "pnpm test", exit: 0 }],
      notChecked: [],
    });
    assert.match(
      validateGoAudit(missingDoneMean, spec)[0]?.message ?? "",
      /missing spec doneMeans command "pnpm lint"/,
    );

    const missingBuiltPiece = makeGoAudit({ builtPieces: ["P1"] });
    assert.match(
      validateGoAudit(missingBuiltPiece, spec)[0]?.message ?? "",
      /builtPieces is missing piece "P2"/,
    );

    const extraBuiltPiece = makeGoAudit({
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "not-done" },
      ],
      builtPieces: ["P1", "P2"],
    });
    assert.match(
      validateGoAudit(extraBuiltPiece, spec)[0]?.message ?? "",
      /builtPieces includes "P2" which is not marked "done"/,
    );

    const dupBuiltPiece = makeGoAudit({ builtPieces: ["P1", "P1", "P2"] });
    assert.match(
      validateGoAudit(dupBuiltPiece, spec)[0]?.message ?? "",
      /duplicate piece ID "P1" in builtPieces/,
    );

    const failedCoveringCmd = makeGoAudit({
      checked: [
        { cmd: "pnpm test", exit: 1, pieces: ["P2"] },
        { cmd: "pnpm lint", exit: 0 },
      ],
    });
    const coveringIssues = validateGoAudit(failedCoveringCmd, spec);
    assert.equal(coveringIssues.length, 1);
    assert.equal(coveringIssues[0]?.path, "checked[0]");
    assert.match(coveringIssues[0]?.message ?? "", /piece "P2" is marked "done".*exited 1/);
  });
});

describe("validateCycleAudit", () => {
  it("handles spec-less cycles and enforces specStatus alignment", () => {
    const noSpecReport = makeCycleAudit({
      pieces: [],
      decisions: [],
      builtPieces: [],
      specStatus: { status: "none" },
    });
    assert.deepEqual(validateCycleAudit(noSpecReport, { reviewFindings: [] }), []);

    const wrongStatusWithoutSpec = makeCycleAudit({
      specStatus: { status: "built" },
    });
    const withoutSpecIssues = validateCycleAudit(wrongStatusWithoutSpec, { reviewFindings: [] });
    assert.equal(withoutSpecIssues.length, 1);
    assert.equal(withoutSpecIssues[0]?.path, "specStatus.status");

    const wrongStatusWithSpec = makeCycleAudit({
      specStatus: { status: "none" },
    });
    const withSpecIssues = validateCycleAudit(wrongStatusWithSpec, {
      spec: makeSpec(),
      reviewFindings: [],
    });
    assert.equal(withSpecIssues.length, 1);
    assert.equal(withSpecIssues[0]?.path, "specStatus.status");
  });

  it("allows specStatus built when do: fix findings are settled as fixed or notAHarm", () => {
    const report = makeCycleAudit({
      fixed: [{ findingId: "F1", report: "review-1.yaml", summary: "Added validation." }],
      notAHarm: [
        { findingId: "F2", report: "review-1.yaml", reason: "Critic confirmed not a harm." },
      ],
      specStatus: { status: "built" },
    });
    const issues = validateCycleAudit(report, {
      spec: makeSpec(),
      reviewFindings: [
        { report: "review-1.yaml", id: "F1", do: "fix" },
        { report: "review-1.yaml", id: "F2", do: "fix" },
        { report: "review-1.yaml", id: "F3", do: "park" },
      ],
    });
    assert.deepEqual(issues, []);
  });

  it("rejects specStatus built when a doneMeans command is only in notChecked, exited non-zero, a piece is not done, or notFixed is non-empty", () => {
    const spec = makeSpec();

    const doneMeanOnlyInNotChecked = makeCycleAudit({
      checked: [{ cmd: "pnpm test", exit: 0, pieces: ["P1", "P2"] }],
      notChecked: [{ check: "pnpm lint", reason: "Skipped." }],
      specStatus: { status: "built" },
    });
    const notCheckedIssues = validateCycleAudit(doneMeanOnlyInNotChecked, {
      spec,
      reviewFindings: [],
    });
    assert.equal(notCheckedIssues.length, 1);
    assert.match(notCheckedIssues[0]?.message ?? "", /pnpm lint.*not in checked/);

    const doneMeanFailed = makeCycleAudit({
      checked: [
        { cmd: "pnpm test", exit: 0, pieces: ["P1", "P2"] },
        { cmd: "pnpm lint", exit: 1 },
      ],
      specStatus: { status: "built" },
    });
    const failedIssues = validateCycleAudit(doneMeanFailed, { spec, reviewFindings: [] });
    assert.equal(failedIssues.length, 1);
    assert.match(failedIssues[0]?.message ?? "", /pnpm lint.*exited non-zero/);

    const pieceNotDone = makeCycleAudit({
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "needs-user", note: "Needs decision." },
      ],
      builtPieces: ["P1"],
      specStatus: { status: "built" },
    });
    const pieceIssues = validateCycleAudit(pieceNotDone, { spec, reviewFindings: [] });
    assert.equal(pieceIssues.length, 1);
    assert.match(pieceIssues[0]?.message ?? "", /piece "P2" has status "needs-user"/);

    const withNotFixed = makeCycleAudit({
      notFixed: [{ findingId: "F1", report: "review-1.yaml", reason: "Needs user call." }],
      specStatus: { status: "built" },
    });
    const notFixedIssues = validateCycleAudit(withNotFixed, {
      spec,
      reviewFindings: [{ report: "review-1.yaml", id: "F1", do: "fix" }],
    });
    assert.equal(notFixedIssues.length, 1);
    assert.equal(notFixedIssues[0]?.path, "notFixed");

    const buildingWithNotFixed = makeCycleAudit({
      notFixed: [{ findingId: "F1", report: "review-1.yaml", reason: "Needs user call." }],
      specStatus: { status: "building", remaining: "Resolve F1." },
    });
    assert.deepEqual(
      validateCycleAudit(buildingWithNotFixed, {
        spec,
        reviewFindings: [{ report: "review-1.yaml", id: "F1", do: "fix" }],
      }),
      [],
    );
  });

  it("rejects missing do: fix findings and duplicate findings across fixed, notAHarm, and notFixed", () => {
    const spec = makeSpec();

    const omittedFinding = makeCycleAudit();
    const omittedIssues = validateCycleAudit(omittedFinding, {
      spec,
      reviewFindings: [{ report: "review-1.yaml", id: "F1", do: "fix" }],
    });
    assert.equal(omittedIssues.length, 1);
    assert.match(omittedIssues[0]?.message ?? "", /F1.*review-1\.yaml.*missing/);

    const dupAcrossFixedAndNotAHarm = makeCycleAudit({
      fixed: [{ findingId: "F1", report: "review-1.yaml", summary: "Fixed." }],
      notAHarm: [{ findingId: "F1", report: "review-1.yaml", reason: "Not a harm." }],
    });
    const dupIssues = validateCycleAudit(dupAcrossFixedAndNotAHarm, {
      spec,
      reviewFindings: [{ report: "review-1.yaml", id: "F1", do: "fix" }],
    });
    assert.equal(dupIssues.length, 1);
    assert.equal(dupIssues[0]?.path, "notAHarm[0]");
    assert.match(dupIssues[0]?.message ?? "", /appears more than once/);

    const dupAcrossNotAHarmAndNotFixed = makeCycleAudit({
      notAHarm: [{ findingId: "F1", report: "review-1.yaml", reason: "Not a harm." }],
      notFixed: [{ findingId: "F1", report: "review-1.yaml", reason: "Not fixed." }],
      specStatus: { status: "building", remaining: "F1" },
    });
    const dupIssues2 = validateCycleAudit(dupAcrossNotAHarmAndNotFixed, {
      spec,
      reviewFindings: [{ report: "review-1.yaml", id: "F1", do: "fix" }],
    });
    assert.equal(dupIssues2.length, 1);
    assert.equal(dupIssues2[0]?.path, "notFixed[0]");
    assert.match(dupIssues2[0]?.message ?? "", /appears more than once/);
  });

  it("enforces spec completeness checks when context.spec is present", () => {
    const spec = makeSpec();

    const missingPiece = makeCycleAudit({
      pieces: [{ id: "P1", status: "done" }],
      builtPieces: ["P1"],
      specStatus: { status: "building", remaining: "P2" },
    });
    const missingPieceIssues = validateCycleAudit(missingPiece, { spec, reviewFindings: [] });
    assert.equal(missingPieceIssues.length, 1);
    assert.match(missingPieceIssues[0]?.message ?? "", /missing spec piece "P2"/);

    const missingDecision = makeCycleAudit({
      decisions: [{ id: "D1", status: "honoured" }],
      specStatus: { status: "building", remaining: "Verify D2" },
    });
    const missingDecisionIssues = validateCycleAudit(missingDecision, {
      spec,
      reviewFindings: [],
    });
    assert.equal(missingDecisionIssues.length, 1);
    assert.match(missingDecisionIssues[0]?.message ?? "", /missing spec decision "D2"/);

    const missingDoneMean = makeCycleAudit({
      checked: [{ cmd: "pnpm test", exit: 0, pieces: ["P1", "P2"] }],
      notChecked: [],
      specStatus: { status: "building", remaining: "Run lint" },
    });
    const missingDoneMeanIssues = validateCycleAudit(missingDoneMean, {
      spec,
      reviewFindings: [],
    });
    assert.equal(missingDoneMeanIssues.length, 1);
    assert.match(
      missingDoneMeanIssues[0]?.message ?? "",
      /missing spec doneMeans command "pnpm lint"/,
    );

    const builtPiecesDrift = makeCycleAudit({
      builtPieces: ["P1"],
      specStatus: { status: "building", remaining: "Sync builtPieces" },
    });
    const builtPiecesIssues = validateCycleAudit(builtPiecesDrift, { spec, reviewFindings: [] });
    assert.equal(builtPiecesIssues.length, 1);
    assert.match(builtPiecesIssues[0]?.message ?? "", /builtPieces is missing piece "P2"/);

    const failedCoveringCmd = makeCycleAudit({
      checked: [
        { cmd: "pnpm test", exit: 1, pieces: ["P2"] },
        { cmd: "pnpm lint", exit: 0 },
      ],
      specStatus: { status: "building", remaining: "Fix P2 tests" },
    });
    const coveringIssues = validateCycleAudit(failedCoveringCmd, { spec, reviewFindings: [] });
    assert.equal(coveringIssues.length, 1);
    assert.equal(coveringIssues[0]?.path, "checked[0]");
    assert.match(coveringIssues[0]?.message ?? "", /piece "P2" is marked "done".*exited 1/);
  });
});
