import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderCycleAudit, renderGoAudit, renderSpec } from "../src/render.ts";
import { CycleAuditReportSchema, GoAuditReportSchema } from "../src/report-schemas.ts";
import { SpecSchema } from "../src/spec-schema.ts";

describe("renderSpec", () => {
  it("renders a minimal spec omitting optional sections and marking empty required sections none", () => {
    const spec = SpecSchema.parse({
      title: "Minimal spec",
      status: "agreed",
      intent: "Keep the minimum structure clean.",
      pieces: [
        {
          id: "P1",
          name: "Core logic",
          owns: ["src/core.ts"],
          now: "Does not exist yet.",
          reuse: "Standard library.",
          change: "Add core module.",
          proof: "node --test test/core.test.ts",
        },
      ],
      doneMeans: [{ cmd: "pnpm test", proves: "All unit tests pass." }],
    });

    const expected = [
      "# Spec: Minimal spec",
      "",
      "**Status:** agreed",
      "",
      "## Intent",
      "Keep the minimum structure clean.",
      "",
      "## Open asks",
      "none",
      "",
      "## Pieces",
      "**Built pieces:** none",
      "",
      "### P1 Core logic · owns: `src/core.ts` · after: none",
      "- **Now:** Does not exist yet.",
      "- **Reuse:** Standard library.",
      "- **Change:** Add core module.",
      "- **Proof:** node --test test/core.test.ts",
      "",
      "## Done means",
      "- `pnpm test`: All unit tests pass.",
      "- Only the user can: none",
      "",
      "## Out of scope",
      "none",
      "",
    ].join("\n");

    assert.equal(renderSpec(spec), expected);
    assert.doesNotMatch(renderSpec(spec), /\*\*Oracle case:\*\*/);
    assert.doesNotMatch(renderSpec(spec), /## Premise/);
    assert.doesNotMatch(renderSpec(spec), /## Decisions/);
    assert.doesNotMatch(renderSpec(spec), /## Invariants and docs/);
    assert.doesNotMatch(renderSpec(spec), /## Parked/);
  });

  it("renders a full spec with oracleCase, premise, decisions, openAsks, outOfScope, and parked", () => {
    const spec = SpecSchema.parse({
      title: "Full pipeline spec",
      status: "draft",
      oracleCase: {
        path: "__oracle__/contracts",
        kind: "cli",
      },
      intent: "Validate and render all pipeline YAML artifacts.",
      premise: [
        {
          assumed: "Specs stay Markdown.",
          actual: "Specs move to YAML.",
          correction: "Build in a worktree first.",
        },
        {
          assumed: "Single CLI binary.",
          actual: "Bundled .mjs script.",
        },
      ],
      decisions: [
        {
          id: "D1",
          title: "Strict schemas",
          what: "Use .strict() everywhere.",
          why: "Catch typos immediately.",
          decidedBy: "agreed",
        },
        {
          id: "D2",
          title: "Pure renderers",
          what: "Keep render.ts free of I/O.",
          why: "Unit tests run without disk access.",
          decidedBy: "agent-when-handed-back",
        },
      ],
      openAsks: [
        {
          id: "A1",
          question: "Should we minify the bundle?",
          rec: "Yes",
          settledBy: "User confirmation",
        },
      ],
      builtPieces: ["P1"],
      pieces: [
        {
          id: "P1",
          name: "Schema",
          owns: ["src/schema.ts"],
          after: [],
          now: "Missing.",
          reuse: "zod",
          change: "Add schema.",
          proof: "node --test test/schema.test.ts",
        },
        {
          id: "P2",
          name: "Renderer",
          owns: ["src/render.ts", "test/render.test.ts"],
          after: ["P1"],
          now: "Missing.",
          reuse: "Spec type",
          change: "Add renderers.",
          proof: "node --test test/render.test.ts",
        },
      ],
      invariantsAndDocs: ["Every schema uses .strict()."],
      doneMeans: [
        { cmd: "pnpm test", proves: "All tests pass." },
        { cmd: "pnpm typecheck", proves: "Strict TypeScript passes." },
      ],
      onlyUserCan: ["Approve merge to main", "Verify installed symlinks"],
      outOfScope: [{ item: "CI wiring", why: "Owned by Spec 3." }],
      parked: [
        {
          item: "Legacy ledger cleanup",
          whoHits: "Oracle maintainers",
          fixAndSize: "Split ledger.ts (~120 lines)",
          rec: "leave",
          why: "Unrelated to Spec 2",
        },
        {
          item: "Stale README link",
          whoHits: "New contributors",
          fixAndSize: "Update path (~2 lines)",
          rec: "fold-in",
          why: "Quick fix",
        },
      ],
    });

    const expected = [
      "# Spec: Full pipeline spec",
      "",
      "**Status:** draft",
      "**Oracle case:** __oracle__/contracts (cli)",
      "",
      "## Intent",
      "Validate and render all pipeline YAML artifacts.",
      "",
      "## Premise",
      "- **Assumed:** Specs stay Markdown. **Actual:** Specs move to YAML. **Correction:** Build in a worktree first.",
      "- **Assumed:** Single CLI binary. **Actual:** Bundled .mjs script.",
      "",
      "## Decisions",
      "1. **Strict schemas.** Use .strict() everywhere. Catch typos immediately. Agreed.",
      "2. **Pure renderers.** Keep render.ts free of I/O. Unit tests run without disk access. Chosen by the agent when handed back.",
      "",
      "## Open asks",
      "1. Should we minify the bundle? (rec: Yes; settled by User confirmation)",
      "",
      "## Pieces",
      "**Built pieces:** P1",
      "",
      "### P1 Schema · owns: `src/schema.ts` · after: none",
      "- **Now:** Missing.",
      "- **Reuse:** zod",
      "- **Change:** Add schema.",
      "- **Proof:** node --test test/schema.test.ts",
      "",
      "### P2 Renderer · owns: `src/render.ts`, `test/render.test.ts` · after: P1",
      "- **Now:** Missing.",
      "- **Reuse:** Spec type",
      "- **Change:** Add renderers.",
      "- **Proof:** node --test test/render.test.ts",
      "",
      "## Invariants and docs",
      "- Every schema uses .strict().",
      "",
      "## Done means",
      "- `pnpm test`: All tests pass.",
      "- `pnpm typecheck`: Strict TypeScript passes.",
      "- Only the user can: Approve merge to main, Verify installed symlinks",
      "",
      "## Out of scope",
      "- CI wiring: Owned by Spec 3.",
      "",
      "## Parked",
      "- Legacy ledger cleanup: Oracle maintainers; Split ledger.ts (~120 lines) (rec: leave, Unrelated to Spec 2)",
      "- Stale README link: New contributors; Update path (~2 lines) (rec: fold in, Quick fix)",
      "",
    ].join("\n");

    assert.equal(renderSpec(spec), expected);
  });
});

describe("renderGoAudit", () => {
  it("collapses honoured decisions and omits empty Findings and Parked sections", () => {
    const audit = GoAuditReportSchema.parse({
      tldr: "All 2 pieces are done and uncommitted.",
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "done", note: "attempt 2" },
      ],
      decisions: [
        { id: "D1", status: "honoured" },
        { id: "D2", status: "honoured" },
      ],
      checked: [
        { cmd: "pnpm test", exit: 0, note: "run by auditor" },
        { cmd: "pnpm lint", exit: 0 },
      ],
      builtPieces: ["P1", "P2"],
    });

    const expected = [
      "## TLDR",
      "All 2 pieces are done and uncommitted.",
      "",
      "## Needs from you",
      "none",
      "",
      "## What changed",
      "- **P1** — done.",
      "- **P2** — done: attempt 2",
      "",
      "## Verification",
      "- **Decisions:** All 2 decisions honoured.",
      "- **Checked:** `pnpm test` exit 0 (run by auditor); `pnpm lint` exit 0",
      "- **Not checked:** none",
      "",
      "---",
      "**Built pieces:** P1, P2",
      "",
    ].join("\n");

    const rendered = renderGoAudit(audit);
    assert.equal(rendered, expected);
    assert.doesNotMatch(rendered, /## Findings/);
    assert.doesNotMatch(rendered, /## Parked/);
  });

  it("expands decisions when any is not-built and renders Findings, Needs from you, Not checked, and Parked", () => {
    const audit = GoAuditReportSchema.parse({
      tldr: "1 of 3 pieces is done; P2 failed and P3 needs a call.",
      findings: [
        {
          title: "Decision D2 not built",
          detail: "No piece implemented the strict check.",
        },
      ],
      needsFromYou: [
        {
          item: "Should empty export fail?",
          rec: "yes",
          detail: "P3 depends on this answer.",
        },
        {
          item: "Run /cycle after fixing P2.",
          rec: "run /cycle",
        },
      ],
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "not-done", note: "pnpm test exit 1" },
        { id: "P3", status: "needs-user" },
      ],
      decisions: [
        { id: "D1", status: "honoured" },
        { id: "D2", status: "not-built", note: "see Finding 1" },
        { id: "D3", status: "not-built" },
      ],
      checked: [],
      notChecked: [{ check: "full gate", reason: "/cycle runs it" }],
      parked: [
        {
          item: "Unindexed query",
          detail: "Scans all rows (~5 lines)",
          rec: "fold-in",
          why: "Hits every caller silently",
        },
        {
          item: "Old helper",
          detail: "Unused export (~10 lines)",
          rec: "leave",
          why: "Outside this spec",
        },
      ],
      builtPieces: [],
    });

    const expected = [
      "## TLDR",
      "1 of 3 pieces is done; P2 failed and P3 needs a call.",
      "",
      "## Findings",
      "1. **Decision D2 not built:** No piece implemented the strict check.",
      "",
      "## Needs from you",
      "1. **Should empty export fail?** (rec: **yes**)",
      "   P3 depends on this answer.",
      "2. **Run /cycle after fixing P2.** (rec: **run /cycle**)",
      "",
      "## What changed",
      "- **P1** — done.",
      "- **P2** — not done: pnpm test exit 1",
      "- **P3** — needs the user.",
      "",
      "## Verification",
      "- **Decisions:** D1 honoured; D2 not built (see Finding 1); D3 not built.",
      "- **Checked:** none",
      "- **Not checked:** full gate (/cycle runs it)",
      "",
      "## Parked",
      "1. **Unindexed query** — Scans all rows (~5 lines) (rec: **fold in**, Hits every caller silently)",
      "2. **Old helper** — Unused export (~10 lines) (rec: **leave**, Outside this spec)",
      "",
      "---",
      "**Built pieces:** none",
      "",
    ].join("\n");

    assert.equal(renderGoAudit(audit), expected);
  });

  it("handles empty decisions and all-not-built decisions cleanly", () => {
    const noDecisions = GoAuditReportSchema.parse({
      tldr: "Done.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [],
      builtPieces: ["P1"],
    });
    assert.match(renderGoAudit(noDecisions), /- \*\*Decisions:\*\* none/);

    const allNotBuilt = GoAuditReportSchema.parse({
      tldr: "Nothing built.",
      pieces: [{ id: "P1", status: "not-done" }],
      decisions: [{ id: "D1", status: "not-built", note: "skipped" }],
      builtPieces: [],
    });
    assert.match(renderGoAudit(allNotBuilt), /- \*\*Decisions:\*\* D1 not built \(skipped\)\./);
  });

  it("renders mixed simple action items and structured decision items under Needs from you", () => {
    const audit = GoAuditReportSchema.parse({
      tldr: "Built P1; P2 awaits a decision.",
      needsFromYou: [
        {
          item: "Empty export behaviour (P2)",
          whatItIs: "Exporting an empty table currently writes a header-only CSV.",
          options: [
            {
              label: "A",
              summary: "Fail with 422 so callers know no rows matched.",
              recommended: true,
            },
            {
              label: "B",
              summary: "Keep writing a header-only CSV.",
              recommended: false,
            },
            {
              label: "C",
              summary: "Return 204 No Content.",
            },
          ],
        },
        {
          item: "Run /cycle",
          rec: "run /cycle",
        },
        {
          item: "Verify local install",
          rec: "check symlinks",
          detail: "Only you can inspect ~/.gemini/config/skills.",
        },
      ],
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "needs-user" },
      ],
      builtPieces: ["P1"],
    });

    const expected = [
      "## TLDR",
      "Built P1; P2 awaits a decision.",
      "",
      "## Needs from you",
      "1. **Empty export behaviour (P2)**",
      "   - **What it is:** Exporting an empty table currently writes a header-only CSV.",
      "   - **Options:**",
      "     - **A (Rec):** Fail with 422 so callers know no rows matched.",
      "     - **B:** Keep writing a header-only CSV.",
      "     - **C:** Return 204 No Content.",
      "2. **Run /cycle** (rec: **run /cycle**)",
      "3. **Verify local install** (rec: **check symlinks**)",
      "   Only you can inspect ~/.gemini/config/skills.",
      "",
      "## What changed",
      "- **P1** — done.",
      "- **P2** — needs the user.",
      "",
      "## Verification",
      "- **Decisions:** none",
      "- **Checked:** none",
      "- **Not checked:** none",
      "",
      "---",
      "**Built pieces:** P1",
      "",
    ].join("\n");

    assert.equal(renderGoAudit(audit), expected);
  });

  it("trims padded option labels when rendering structured decision items", () => {
    const audit = GoAuditReportSchema.parse({
      tldr: "P1 awaits a decision.",
      needsFromYou: [
        {
          item: "Option spacing (P1)",
          whatItIs: "Labels may arrive with surrounding spaces.",
          options: [
            { label: " A ", summary: "Trim recommended label.", recommended: true },
            { label: "  B  ", summary: "Trim regular label." },
          ],
        },
      ],
      pieces: [{ id: "P1", status: "needs-user" }],
      builtPieces: [],
    });

    const rendered = renderGoAudit(audit);
    assert.match(rendered, /\n {5}- \*\*A \(Rec\):\*\* Trim recommended label\.\n/);
    assert.match(rendered, /\n {5}- \*\*B:\*\* Trim regular label\.\n/);
  });
});

describe("renderCycleAudit", () => {
  it("renders a built spec cycle audit with commits, collapsed decisions, and mutation", () => {
    const audit = CycleAuditReportSchema.parse({
      tldr: "Committed all changes in 2 commits. Gate is green and spec is built.",
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "done" },
      ],
      decisions: [
        { id: "D1", status: "honoured" },
        { id: "D2", status: "honoured" },
      ],
      checked: [{ cmd: "pnpm test", exit: 0 }],
      commits: [
        { sha: "4f1c2ab", subject: "feat(contracts): add schemas", bullets: [] },
        {
          sha: "9be03d1",
          subject: "fix(contracts): tighten validator",
          bullets: ["Reject duplicate IDs.", "Cover cycle path formatting."],
        },
      ],
      gate: "green",
      mutation: "0 survivors across 14 mutants.",
      builtPieces: ["P1", "P2"],
      specStatus: { status: "built" },
    });

    const expected = [
      "## TLDR",
      "Committed all changes in 2 commits. Gate is green and spec is built.",
      "",
      "## Needs from you",
      "none",
      "",
      "## What changed",
      "- **`4f1c2ab`** `feat(contracts): add schemas`",
      "- **`9be03d1`** `fix(contracts): tighten validator`",
      "  - Reject duplicate IDs.",
      "  - Cover cycle path formatting.",
      "",
      "## Verification",
      "- **Pieces:** P1, P2 done.",
      "- **Decisions:** All 2 decisions honoured.",
      "- **Gate:** green",
      "- **Checked:** `pnpm test` exit 0",
      "- **Not checked:** none",
      "- **Mutation:** 0 survivors across 14 mutants.",
      "",
      "---",
      "**Built pieces:** P1, P2",
      "**Spec:** built",
      "",
    ].join("\n");

    assert.equal(renderCycleAudit(audit), expected);
  });

  it("renders a building spec cycle audit with mixed pieces, expanded decisions, findings, and parked items", () => {
    const audit = CycleAuditReportSchema.parse({
      tldr: "Committed P1; P2 still fails and P3 awaits your call.",
      findings: [{ title: "P2 failed", detail: "pnpm test exited 1." }],
      needsFromYou: [{ item: "Approve fallback", rec: "keep default", detail: "Blocks P3." }],
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "not-done", note: "see Finding 1" },
        { id: "P3", status: "needs-user" },
      ],
      decisions: [
        { id: "D1", status: "honoured" },
        { id: "D2", status: "not-built", note: "waits on P2" },
      ],
      checked: [{ cmd: "pnpm test", exit: 1 }],
      notChecked: [{ check: "mutation", reason: "none configured" }],
      parked: [
        {
          item: "Unused helper",
          detail: "Leftover from refactor",
          rec: "leave",
          why: "Out of scope",
        },
      ],
      commits: [{ sha: "abc1234", subject: "feat(contracts): build P1", bullets: [] }],
      gate: "failed",
      builtPieces: ["P1"],
      specStatus: { status: "building", remaining: "P2 proof still fails" },
    });

    const expected = [
      "## TLDR",
      "Committed P1; P2 still fails and P3 awaits your call.",
      "",
      "## Findings",
      "1. **P2 failed:** pnpm test exited 1.",
      "",
      "## Needs from you",
      "1. **Approve fallback** (rec: **keep default**)",
      "   Blocks P3.",
      "",
      "## What changed",
      "- **`abc1234`** `feat(contracts): build P1`",
      "",
      "## Verification",
      "- **Pieces:** P1 done; P2 not done (see Finding 1); P3 needs the user.",
      "- **Decisions:** D1 honoured; D2 not built (waits on P2).",
      "- **Gate:** failed",
      "- **Checked:** `pnpm test` exit 1",
      "- **Not checked:** mutation (none configured)",
      "",
      "## Parked",
      "1. **Unused helper** — Leftover from refactor (rec: **leave**, Out of scope)",
      "",
      "---",
      "**Built pieces:** P1",
      "**Spec:** building: P2 proof still fails",
      "",
    ].join("\n");

    const rendered = renderCycleAudit(audit);
    assert.equal(rendered, expected);
    assert.doesNotMatch(rendered, /\*\*Mutation:\*\*/);
  });

  it("renders a no-spec cycle audit with explicit none-without-a-spec lines and none tails", () => {
    const audit = CycleAuditReportSchema.parse({
      tldr: "Reviewed standalone dirty work with no spec.",
      commits: [],
      gate: "none-named",
      builtPieces: ["P1"],
      specStatus: { status: "none" },
    });

    const expected = [
      "## TLDR",
      "Reviewed standalone dirty work with no spec.",
      "",
      "## Needs from you",
      "none",
      "",
      "## What changed",
      "none",
      "",
      "## Verification",
      "- **Pieces:** (none without a spec)",
      "- **Decisions:** (none without a spec)",
      "- **Gate:** none-named",
      "- **Checked:** none",
      "- **Not checked:** none",
      "",
      "---",
      "**Built pieces:** none",
      "**Spec:** none",
      "",
    ].join("\n");

    assert.equal(renderCycleAudit(audit), expected);
  });

  it("renders empty pieces and empty builtPieces as none when a spec is active", () => {
    const audit = CycleAuditReportSchema.parse({
      tldr: "Spec active with no settled pieces.",
      pieces: [],
      decisions: [],
      gate: "unlisted",
      builtPieces: [],
      specStatus: { status: "building", remaining: "no pieces built yet" },
    });

    const rendered = renderCycleAudit(audit);
    assert.match(rendered, /- \*\*Pieces:\*\* none/);
    assert.match(rendered, /\*\*Built pieces:\*\* none/);
  });

  it("renders done pieces with notes separately from unnoted done pieces", () => {
    const mixed = CycleAuditReportSchema.parse({
      tldr: "Both pieces done.",
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "done", note: "attempt 2" },
      ],
      decisions: [],
      gate: "green",
      builtPieces: ["P1", "P2"],
      specStatus: { status: "built" },
    });

    assert.match(renderCycleAudit(mixed), /- \*\*Pieces:\*\* P1 done; P2 done \(attempt 2\)\./);

    const notedOnly = CycleAuditReportSchema.parse({
      tldr: "Only noted pieces present.",
      pieces: [{ id: "P1", status: "done", note: "attempt 2" }],
      decisions: [],
      gate: "green",
      builtPieces: ["P1"],
      specStatus: { status: "built" },
    });

    assert.match(renderCycleAudit(notedOnly), /- \*\*Pieces:\*\* P1 done \(attempt 2\)\./);
  });

  it("renders mixed simple action items and structured decision items under Needs from you", () => {
    const audit = CycleAuditReportSchema.parse({
      tldr: "Committed P1; F2 needs a product call.",
      needsFromYou: [
        {
          item: "Fallback timeout policy (F2)",
          whatItIs: "The adapter currently retries indefinitely when the upstream stalls.",
          options: [
            {
              label: "A",
              summary: "Cap retries at 3 with exponential backoff and return 503.",
              recommended: true,
            },
            {
              label: "B",
              summary: "Fail immediately on the first timeout with no retry.",
            },
          ],
        },
        {
          item: "Approve push to main",
          rec: "push",
        },
      ],
      pieces: [{ id: "P1", status: "done" }],
      commits: [{ sha: "abc1234", subject: "feat(contracts): build P1", bullets: [] }],
      gate: "green",
      builtPieces: ["P1"],
      specStatus: { status: "building", remaining: "Resolve F2." },
    });

    const expected = [
      "## TLDR",
      "Committed P1; F2 needs a product call.",
      "",
      "## Needs from you",
      "1. **Fallback timeout policy (F2)**",
      "   - **What it is:** The adapter currently retries indefinitely when the upstream stalls.",
      "   - **Options:**",
      "     - **A (Rec):** Cap retries at 3 with exponential backoff and return 503.",
      "     - **B:** Fail immediately on the first timeout with no retry.",
      "2. **Approve push to main** (rec: **push**)",
      "",
      "## What changed",
      "- **`abc1234`** `feat(contracts): build P1`",
      "",
      "## Verification",
      "- **Pieces:** P1 done.",
      "- **Decisions:** none",
      "- **Gate:** green",
      "- **Checked:** none",
      "- **Not checked:** none",
      "",
      "---",
      "**Built pieces:** P1",
      "**Spec:** building: Resolve F2.",
      "",
    ].join("\n");

    assert.equal(renderCycleAudit(audit), expected);
  });
});
