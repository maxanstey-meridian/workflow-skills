import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DesignReportSchema,
  HunterReportSchema,
  SlopAuditSchema,
  VerifyReportSchema,
} from "../src/schemas.ts";
import {
  validateAreasAgainstScope,
  validateDesignReport,
  validateHunterReport,
  validateSlopAudit,
  validateVerifyAgainstReport,
} from "../src/validate.ts";

const makeFinding = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  sign: 2,
  kind: "proven",
  risk: "low",
  where: "src/a.ts:10",
  what: "Unused wrapper.",
  replaceWith: "delete",
  removes: "20 lines",
  usersLose: "none",
  proof: "Zero callers found.",
  protectedBy: "typecheck",
  ...overrides,
});

describe("validateAreasAgainstScope", () => {
  const scope = ["src/api/a.ts", "src/api/b.ts", "src/web/c.ts"];
  const sizes = new Map<string, number>([
    ["src/api/a.ts", 100],
    ["src/api/b.ts", 250],
    ["src/web/c.ts", 400],
  ]);

  it("enriches valid base and -rest areas with computed line totals", () => {
    const result = validateAreasAgainstScope(
      [
        { name: "api", files: ["src/api/a.ts", "src/api/b.ts"] },
        { name: "web", files: ["src/web/c.ts"] },
        { name: "api-rest", files: ["src/api/b.ts"] },
      ],
      scope,
      sizes,
    );

    assert.deepEqual(result.issues, []);
    assert.deepEqual(result.areas, [
      { name: "api", lines: 350, files: ["src/api/a.ts", "src/api/b.ts"] },
      { name: "web", lines: 400, files: ["src/web/c.ts"] },
      { name: "api-rest", lines: 250, files: ["src/api/b.ts"] },
    ]);
  });

  it("rejects uncovered scope files, overlapping base areas, unknown paths, and duplicate/non-kebab names", () => {
    const result = validateAreasAgainstScope(
      [
        { name: "Api", files: ["src/api/a.ts", "src/unknown.ts"] },
        { name: "Api", files: ["src/api/a.ts"] },
      ],
      scope,
      sizes,
    );

    assert.ok(result.issues.some((i) => i.message.includes("kebab-case")));
    assert.ok(result.issues.some((i) => i.message.includes("duplicate area name")));
    assert.ok(result.issues.some((i) => i.message.includes("unknown path")));
    assert.ok(result.issues.some((i) => i.message.includes("already assigned")));
    assert.ok(result.issues.some((i) => i.message.includes("src/web/c.ts")));
  });

  it("rejects empty areas and empty base area file lists", () => {
    const emptyAreas = validateAreasAgainstScope([], scope, sizes);
    assert.ok(emptyAreas.issues.some((i) => i.message.includes("at least one area")));

    const emptyBase = validateAreasAgainstScope(
      [
        { name: "empty", files: [] },
        { name: "all", files: scope },
      ],
      scope,
      sizes,
    );
    assert.ok(emptyBase.issues.some((i) => i.message.includes("must contain at least one file")));
  });

  it("rejects invalid -rest areas: missing base, empty subset, out-of-base file, duplicate file, and -rest-rest", () => {
    const missingBase = validateAreasAgainstScope(
      [
        { name: "all", files: scope },
        { name: "ghost-rest", files: ["src/api/a.ts"] },
      ],
      scope,
      sizes,
    );
    assert.ok(missingBase.issues.some((i) => i.message.includes('requires base area "ghost"')));

    const emptyRest = validateAreasAgainstScope(
      [
        { name: "all", files: scope },
        { name: "all-rest", files: [] },
      ],
      scope,
      sizes,
    );
    assert.ok(emptyRest.issues.some((i) => i.message.includes("non-empty subset")));

    const outOfBaseAndDup = validateAreasAgainstScope(
      [
        { name: "api", files: ["src/api/a.ts", "src/api/b.ts"] },
        { name: "web", files: ["src/web/c.ts"] },
        { name: "api-rest", files: ["src/web/c.ts", "src/api/a.ts", "src/api/a.ts"] },
        { name: "api-rest-rest", files: ["src/api/a.ts"] },
      ],
      scope,
      sizes,
    );
    assert.ok(outOfBaseAndDup.issues.some((i) => i.message.includes("is not in base area")));
    assert.ok(outOfBaseAndDup.issues.some((i) => i.message.includes("duplicate path")));
    assert.ok(
      outOfBaseAndDup.issues.some((i) => i.message.includes('requires base area "api-rest"')),
    );
  });
});

describe("validateDesignReport and validateHunterReport", () => {
  it("validates unique finding IDs on design reports", () => {
    const valid = DesignReportSchema.parse({
      houseShape: "Clean CLI.",
      weightMap: [
        {
          capability: "Core",
          files: "src/core.ts",
          lines: 100,
          sharePct: 60,
          status: "earned",
          earnedWhy: "Core domain",
        },
        {
          capability: "Jobs",
          files: "src/jobs.ts",
          lines: 67,
          sharePct: 40,
          status: "finding",
          findingId: "D1",
        },
      ],
      findings: [makeFinding("D1")],
    });
    assert.deepEqual(validateDesignReport(valid), []);

    const invalid = DesignReportSchema.parse({
      houseShape: "Clean CLI.",
      weightMap: [
        {
          capability: "Core",
          files: "src/core.ts",
          lines: 100,
          sharePct: 100,
          status: "earned",
          earnedWhy: "Core domain",
        },
      ],
      findings: [makeFinding("D1"), makeFinding("D1")],
    });

    const issues = validateDesignReport(invalid);
    assert.ok(issues.some((i) => i.path === "findings[1].id"));
  });

  it("enforces singleArea houseShape and relative notReadInFull paths on hunter reports", () => {
    const report = HunterReportSchema.parse({
      weightMap: [],
      findings: [makeFinding("#1")],
      notReadInFull: ["src/big.ts"],
    });

    assert.deepEqual(validateHunterReport(report, { singleArea: false }), []);
    const singleAreaIssues = validateHunterReport(report, { singleArea: true });
    assert.ok(singleAreaIssues.some((i) => i.path === "houseShape"));

    const withHouseShape = HunterReportSchema.parse({
      houseShape: "Small single-area CLI.",
      weightMap: [],
      findings: [makeFinding("#1")],
      notReadInFull: ["src/big.ts"],
    });
    assert.deepEqual(validateHunterReport(withHouseShape, { singleArea: true }), []);

    const badPaths = HunterReportSchema.parse({
      weightMap: [],
      notReadInFull: ["", "   ", "/abs/path.ts", "../escape.ts", "src/../escape.ts", "C:\\win.ts"],
    });
    const pathIssues = validateHunterReport(badPaths, { singleArea: false });
    assert.equal(pathIssues.length, 6);
  });
});

describe("validateVerifyAgainstReport", () => {
  const target = HunterReportSchema.parse({
    weightMap: [],
    findings: [makeFinding("#1"), makeFinding("#2")],
    cleanup: [{ where: "src/old.ts:3", what: "Unused import", replaceWith: "delete" }],
    alsoNoticed: [
      { where: "src/csv.ts:58", what: "Swallowed write error", tag: "data-loss" },
      { where: "src/auth.ts:12", what: "Missing tenant filter", tag: "security" },
      { where: "src/ui.ts:9", what: "Minor typo" },
    ],
    notReadInFull: [],
  });

  it("passes when every finding, tagged alsoNoticed, and cleanup entry has a unique verdict", () => {
    const verify = VerifyReportSchema.parse({
      verdicts: [
        { target: "#1", verdict: "kept", why: "Confirmed." },
        { target: "#2", verdict: "dropped", why: "Used in tests." },
      ],
      alsoNoticedVerdicts: [
        { where: "src/csv.ts:58", verdict: "kept", why: "Catch swallows error." },
        { where: "src/auth.ts:12", verdict: "dropped", why: "Filter is in middleware." },
      ],
      cleanupVerdicts: [{ where: "src/old.ts:3", verdict: "kept", why: "Unused." }],
    });

    assert.deepEqual(validateVerifyAgainstReport(verify, target), []);
  });

  it("rejects missing, unknown, and duplicate verdicts across findings, tagged alsoNoticed, and cleanup", () => {
    const verify = VerifyReportSchema.parse({
      verdicts: [
        { target: "#1", verdict: "kept", why: "Confirmed." },
        { target: "#1", verdict: "dropped", why: "Duplicate." },
        { target: "#99", verdict: "kept", why: "Unknown." },
      ],
      alsoNoticedVerdicts: [
        { where: "src/csv.ts:58", verdict: "kept", why: "Confirmed." },
        { where: "src/csv.ts:58", verdict: "kept", why: "Duplicate." },
        { where: "src/missing.ts:1", verdict: "dropped", why: "Unknown." },
      ],
      cleanupVerdicts: [{ where: "src/nope.ts:1", verdict: "kept", why: "Unknown." }],
    });

    const issues = validateVerifyAgainstReport(verify, target);
    assert.ok(issues.some((i) => i.message.includes('duplicate verdict target "#1"')));
    assert.ok(issues.some((i) => i.message.includes('unknown finding target "#99"')));
    assert.ok(issues.some((i) => i.message.includes('missing verdict for finding "#2"')));
    assert.ok(
      issues.some((i) =>
        i.message.includes('duplicate alsoNoticed verdict target "src/csv.ts:58"'),
      ),
    );
    assert.ok(
      issues.some((i) => i.message.includes('unknown alsoNoticed target "src/missing.ts:1"')),
    );
    assert.ok(
      issues.some((i) =>
        i.message.includes('missing verdict for tagged alsoNoticed entry "src/auth.ts:12"'),
      ),
    );
    assert.ok(issues.some((i) => i.message.includes('unknown cleanup target "src/nope.ts:1"')));
    assert.ok(
      issues.some((i) => i.message.includes('missing verdict for cleanup entry "src/old.ts:3"')),
    );

    const dupCleanup = validateVerifyAgainstReport(
      VerifyReportSchema.parse({
        verdicts: [
          { target: "#1", verdict: "kept", why: "Confirmed." },
          { target: "#2", verdict: "kept", why: "Confirmed." },
        ],
        alsoNoticedVerdicts: [
          { where: "src/csv.ts:58", verdict: "kept", why: "Confirmed." },
          { where: "src/auth.ts:12", verdict: "kept", why: "Confirmed." },
        ],
        cleanupVerdicts: [
          { where: "src/old.ts:3", verdict: "kept", why: "Confirmed." },
          { where: "src/old.ts:3", verdict: "dropped", why: "Duplicate." },
        ],
      }),
      target,
    );
    assert.ok(
      dupCleanup.some((i) => i.message.includes('duplicate cleanup verdict target "src/old.ts:3"')),
    );
  });
});

describe("validateSlopAudit", () => {
  const baseAudit = () =>
    SlopAuditSchema.parse({
      tldr: "Most of the repo is earned.",
      needsFromYou: [{ item: "Drop D1?", rec: "yes" }],
      weightMap: [
        {
          capability: "Core",
          lines: 1000,
          sharePct: 80,
          status: "earned",
          earnedWhy: "Primary product logic",
        },
        {
          capability: "Retries",
          lines: 250,
          sharePct: 20,
          status: "finding",
          findingId: "D1",
        },
      ],
      design: [
        makeFinding("D1", {
          kind: "judgement",
          against: "In-flight sends drop on restart.",
        }),
      ],
      code: [makeFinding("#1")],
      hunted: {
        repo: "cases",
        head: "801310e",
      },
    });

  it("passes for a valid audit", () => {
    assert.deepEqual(validateSlopAudit(baseAudit()), []);
  });

  it("rejects empty tldr/weightMap/needsFromYou and duplicate IDs across design and code", () => {
    const audit = SlopAuditSchema.parse({
      tldr: "   ",
      needsFromYou: [],
      weightMap: [],
      design: [makeFinding("D1", { kind: "judgement", against: "Tradeoff noted." })],
      code: [makeFinding("D1", { kind: "proven" })],
      hunted: {
        repo: "cases",
        head: "801310e",
      },
    });

    const issues = validateSlopAudit(audit);
    assert.ok(issues.some((i) => i.path === "tldr"));
    assert.ok(issues.some((i) => i.path === "weightMap"));
    assert.ok(issues.some((i) => i.path === "needsFromYou"));
    assert.ok(issues.some((i) => i.path === "code[0].id"));
  });
});
