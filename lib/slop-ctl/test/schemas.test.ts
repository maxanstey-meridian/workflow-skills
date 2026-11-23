import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AreasFileSchema,
  AreasInputSchema,
  DesignReportSchema,
  HunterReportSchema,
  SlopActionSchema,
  SlopAuditSchema,
  SlopAuditWeightMapItemSchema,
  SlopStateSchema,
  VerifyReportSchema,
  WeightMapItemSchema,
} from "../src/schemas.ts";

const makeFindingBody = (overrides: Record<string, unknown> = {}) => ({
  sign: 1,
  kind: "proven",
  risk: "low",
  where: "src/foo.ts:10",
  what: "Hand-rolled slug helper.",
  replaceWith: "slugify 1.6 (already in package.json)",
  removes: "45 lines",
  usersLose: "none",
  proof: "Checked package.json and lockfile.",
  protectedBy: "slug.test.ts",
  ...overrides,
});

describe("AreasFileSchema and AreasInputSchema", () => {
  it("accepts valid areas.yaml and AreasInput with omitted root, head, and lines", () => {
    const full = AreasFileSchema.parse({
      root: "/repo",
      head: "abc1234",
      areas: [
        { name: "api-v2", lines: 1200, files: ["src/api.ts"] },
        { name: "api-v2-rest", lines: 300, files: ["src/api.ts"] },
      ],
    });
    assert.equal(full.areas.length, 2);

    const input = AreasInputSchema.parse({
      areas: [{ name: "core", files: ["src/core.ts"] }],
    });
    assert.equal(input.root, undefined);
    assert.equal(input.head, undefined);
    assert.equal(input.areas[0]?.lines, undefined);
  });

  it("rejects non-kebab area names, negative lines, empty areas, and unknown keys", () => {
    for (const badName of ["Api", "foo_bar", "-rest", "foo--bar", "api/"]) {
      assert.equal(
        AreasInputSchema.safeParse({
          areas: [{ name: badName, files: ["src/a.ts"] }],
        }).success,
        false,
        `expected ${badName} to fail`,
      );
    }

    assert.equal(
      AreasFileSchema.safeParse({
        root: "/repo",
        head: "abc1234",
        areas: [{ name: "api", lines: -1, files: ["src/a.ts"] }],
      }).success,
      false,
    );

    assert.equal(
      AreasFileSchema.safeParse({
        root: "/repo",
        head: "abc1234",
        areas: [],
      }).success,
      false,
    );

    assert.equal(
      AreasFileSchema.safeParse({
        root: "/repo",
        head: "abc1234",
        areas: [{ name: "api", lines: 10, files: ["src/a.ts"] }],
        extra: true,
      }).success,
      false,
    );
  });
});

describe("WeightMapItemSchema", () => {
  it("accepts earned and finding items and rejects out-of-range sharePct or unknown keys", () => {
    assert.equal(
      WeightMapItemSchema.safeParse({
        capability: "Routing",
        files: "src/routes/",
        lines: 500,
        sharePct: 12.5,
        status: "earned",
        earnedWhy: "Core HTTP surface",
      }).success,
      true,
    );

    assert.equal(
      WeightMapItemSchema.safeParse({
        capability: "Retry queue",
        files: "src/retry/",
        lines: 410,
        sharePct: 101,
        status: "finding",
        findingId: "D1",
      }).success,
      false,
    );

    assert.equal(
      WeightMapItemSchema.safeParse({
        capability: "Retry queue",
        files: "src/retry/",
        lines: 410,
        sharePct: 10,
        status: "finding",
        findingId: "D1",
        extra: "nope",
      }).success,
      false,
    );
  });

  it("enforces earnedWhy/findingId discriminated pairing on WeightMapItemSchema and SlopAuditWeightMapItemSchema", () => {
    // Missing earnedWhy or unexpected findingId on status "earned"
    assert.equal(
      WeightMapItemSchema.safeParse({
        capability: "Core",
        files: "src/core.ts",
        lines: 100,
        sharePct: 50,
        status: "earned",
      }).success,
      false,
    );
    assert.equal(
      WeightMapItemSchema.safeParse({
        capability: "Core",
        files: "src/core.ts",
        lines: 100,
        sharePct: 50,
        status: "earned",
        earnedWhy: "Core domain",
        findingId: "D1",
      }).success,
      false,
    );
    // Missing findingId or unexpected earnedWhy on status "finding"
    assert.equal(
      WeightMapItemSchema.safeParse({
        capability: "Jobs",
        files: "src/jobs.ts",
        lines: 100,
        sharePct: 50,
        status: "finding",
      }).success,
      false,
    );
    assert.equal(
      WeightMapItemSchema.safeParse({
        capability: "Jobs",
        files: "src/jobs.ts",
        lines: 100,
        sharePct: 50,
        status: "finding",
        findingId: "D1",
        earnedWhy: "Wrong field",
      }).success,
      false,
    );

    assert.equal(
      SlopAuditWeightMapItemSchema.safeParse({
        capability: "Core",
        lines: 100,
        sharePct: 50,
        status: "earned",
      }).success,
      false,
    );
    assert.equal(
      SlopAuditWeightMapItemSchema.safeParse({
        capability: "Core",
        lines: 100,
        sharePct: 50,
        status: "earned",
        earnedWhy: "Core domain",
        findingId: "D1",
      }).success,
      false,
    );
    assert.equal(
      SlopAuditWeightMapItemSchema.safeParse({
        capability: "Jobs",
        lines: 100,
        sharePct: 50,
        status: "finding",
      }).success,
      false,
    );
    assert.equal(
      SlopAuditWeightMapItemSchema.safeParse({
        capability: "Jobs",
        lines: 100,
        sharePct: 50,
        status: "finding",
        findingId: "D1",
        earnedWhy: "Wrong field",
      }).success,
      false,
    );
  });
});

describe("DesignReportSchema", () => {
  it("accepts valid design reports with proven and judgement findings", () => {
    const parsed = DesignReportSchema.parse({
      houseShape: "Modular monolith with thin routes.",
      weightMap: [
        {
          capability: "Jobs",
          files: "src/jobs/",
          lines: 410,
          sharePct: 20,
          status: "finding",
          findingId: "D1",
        },
      ],
      findings: [
        { id: "D1", ...makeFindingBody({ kind: "proven" }) },
        {
          id: "D2",
          ...makeFindingBody({
            sign: 13,
            kind: "judgement",
            risk: "med",
            against: "Restart survival is lost on deploy.",
          }),
        },
      ],
    });
    assert.equal(parsed.findings.length, 2);
    assert.deepEqual(parsed.cleanup, []);
    assert.deepEqual(parsed.alsoNoticed, []);
    assert.deepEqual(parsed.leadsDropped, []);
  });

  it("rejects invalid IDs, out-of-range signs, missing against on judgement, against on proven, and unknown keys", () => {
    const base = {
      houseShape: "Thin CLI.",
      weightMap: [],
    };

    assert.equal(
      DesignReportSchema.safeParse({
        ...base,
        findings: [{ id: "#1", ...makeFindingBody() }],
      }).success,
      false,
    );

    assert.equal(
      DesignReportSchema.safeParse({
        ...base,
        findings: [{ id: "D1", ...makeFindingBody({ sign: 14 }) }],
      }).success,
      false,
    );

    assert.equal(
      DesignReportSchema.safeParse({
        ...base,
        findings: [{ id: "D1", ...makeFindingBody({ kind: "judgement" }) }],
      }).success,
      false,
    );

    assert.equal(
      DesignReportSchema.safeParse({
        ...base,
        findings: [
          {
            id: "D1",
            ...makeFindingBody({ kind: "proven", against: "Should not be here" }),
          },
        ],
      }).success,
      false,
    );

    assert.equal(
      DesignReportSchema.safeParse({
        ...base,
        unknownKey: 1,
      }).success,
      false,
    );
  });
});

describe("HunterReportSchema", () => {
  it("accepts valid hunter reports and requires notReadInFull", () => {
    const parsed = HunterReportSchema.parse({
      weightMap: [],
      findings: [{ id: "#1", ...makeFindingBody() }],
      notesOnDesign: [
        {
          findingId: "D1",
          stance: "confirmed",
          where: "src/jobs/retry.ts:12",
          note: "Confirmed no callers outside worker.",
        },
      ],
      findersCouldntSee: [{ path: "src/legacy.js", why: "Excluded from knip config" }],
      notReadInFull: [],
    });
    assert.equal(parsed.findings[0]?.id, "#1");
    assert.deepEqual(parsed.notReadInFull, []);

    assert.equal(
      HunterReportSchema.safeParse({
        weightMap: [],
      }).success,
      false,
    );

    assert.equal(
      HunterReportSchema.safeParse({
        weightMap: [],
        findings: [{ id: "D1", ...makeFindingBody() }],
        notReadInFull: [],
      }).success,
      false,
    );

    assert.equal(
      HunterReportSchema.safeParse({
        weightMap: [],
        findings: [{ id: "#1", ...makeFindingBody({ kind: "judgement" }) }],
        notReadInFull: [],
      }).success,
      false,
    );
  });
});

describe("VerifyReportSchema", () => {
  it("accepts valid verify reports and rejects invalid verdicts or unknown keys", () => {
    const parsed = VerifyReportSchema.parse({
      verdicts: [
        { target: "#1", verdict: "kept", why: "Confirmed unused." },
        {
          target: "D1",
          verdict: "kept",
          why: "Holds.",
          against: "Weekly restarts drop in-flight jobs.",
        },
      ],
      alsoNoticedVerdicts: [
        { where: "src/csv.ts:58", verdict: "kept", why: "Catch swallows IO error." },
      ],
      cleanupVerdicts: [{ where: "src/old.ts:1", verdict: "dropped", why: "Still imported." }],
      raisedFromDroppedLeads: [
        {
          where: "src/slug.ts:1",
          sign: 1,
          kind: "proven",
          why: "Library already installed.",
        },
      ],
    });
    assert.equal(parsed.verdicts.length, 2);

    assert.equal(
      VerifyReportSchema.safeParse({
        verdicts: [{ target: "#1", verdict: "maybe", why: "Unsure" }],
      }).success,
      false,
    );

    assert.equal(
      VerifyReportSchema.safeParse({
        verdicts: [],
        extra: [],
      }).success,
      false,
    );
  });
});

describe("SlopAuditSchema, SlopStateSchema, and SlopActionSchema", () => {
  it("parses valid SlopAudit, SlopState, and all SlopAction variants", () => {
    const audit = SlopAuditSchema.parse({
      tldr: "Lean codebase with one retry subsystem to drop.",
      needsFromYou: [{ item: "Drop D1?", rec: "yes" }],
      weightMap: [
        {
          capability: "Core",
          lines: 1000,
          sharePct: 100,
          status: "earned",
          earnedWhy: "Main workflow",
        },
      ],
      hunted: {
        repo: "workflow-skills",
        head: "801310e",
      },
    });
    assert.equal(audit.hunted.repo, "workflow-skills");

    const state = SlopStateSchema.parse({
      root: "/repo",
      mainDir: "/repo",
      skillDir: "/repo/skills/slop-hunt",
      runDir: "/repo/.plans/scratch/slop-hunt-20260101-000000",
      head: "801310e",
      scopeReviewed: false,
      areasSplit: false,
      retries: { "hunter:api": 1 },
      phase: "hunt",
    });
    assert.equal(state.phase, "hunt");

    const actions = [
      {
        action: "review-scope",
        scopeFile: "/run/scope.txt",
        sizesFile: "/run/sizes.txt",
        oversized: [{ path: "src/big.ts", lines: 2500 }],
        topBiggest: [{ path: "src/big.ts", lines: 2500 }],
      },
      {
        action: "split",
        scopeFile: "/run/scope.txt",
        sizesFile: "/run/sizes.txt",
        areasFile: "/run/areas.yaml",
        totalLines: 12000,
        errors: [],
      },
      {
        action: "spawn",
        parallel: true,
        maxConcurrency: 8,
        subagents: [
          {
            role: "hunter",
            yours: "api",
            report: "/run/report-api.yaml",
            brief: "Read ...",
          },
        ],
      },
      {
        action: "relay",
        report: "/run/report.md",
      },
      {
        action: "stop",
        reason: "No scannable files found.",
        details: ["scope.txt was empty"],
      },
    ];

    for (const action of actions) {
      assert.equal(SlopActionSchema.safeParse(action).success, true);
    }

    assert.equal(
      SlopActionSchema.safeParse({
        action: "spawn",
        parallel: true,
        maxConcurrency: 8,
        subagents: [],
      }).success,
      false,
    );

    assert.equal(
      SlopStateSchema.safeParse({
        ...state,
        phase: "unknown-phase",
      }).success,
      false,
    );
  });

  it("rejects judgement findings without against and proven findings with against in SlopAuditSchema", () => {
    const base = {
      tldr: "Summary.",
      needsFromYou: [{ item: "Review." }],
      weightMap: [
        {
          capability: "Core",
          lines: 100,
          sharePct: 100,
          status: "earned",
          earnedWhy: "Core",
        },
      ],
      hunted: { repo: "cases", head: "801310e" },
    };

    assert.equal(
      SlopAuditSchema.safeParse({
        ...base,
        design: [{ id: "D1", ...makeFindingBody({ kind: "judgement" }) }],
      }).success,
      false,
    );

    assert.equal(
      SlopAuditSchema.safeParse({
        ...base,
        code: [{ id: "#1", ...makeFindingBody({ kind: "judgement" }) }],
      }).success,
      false,
    );

    assert.equal(
      SlopAuditSchema.safeParse({
        ...base,
        code: [{ id: "#1", ...makeFindingBody({ kind: "proven", against: "Unexpected" }) }],
      }).success,
      false,
    );
  });
});
