import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderSlopAudit } from "../src/render.ts";
import { SlopAuditSchema } from "../src/schemas.ts";

describe("renderSlopAudit", () => {
  it("omits empty optional sections and renders minimal required sections", () => {
    const audit = SlopAuditSchema.parse({
      tldr: "Lean 2,000-line repo; everything earns its weight.",
      needsFromYou: [{ item: "No action needed unless you want to hunt another branch." }],
      weightMap: [
        {
          capability: "CLI",
          lines: 2000,
          sharePct: 100,
          status: "earned",
          earnedWhy: "Core command surface",
        },
      ],
      hunted: {
        repo: "tool",
        head: "1234abc",
      },
    });

    const expected = [
      "## TLDR",
      "Lean 2,000-line repo; everything earns its weight.",
      "",
      "## Needs from you",
      "1. No action needed unless you want to hunt another branch.",
      "",
      "## Weight map",
      "- **CLI** — 2,000 lines (100%) — earned: Core command surface",
      "",
      "## Hunted",
      "- **Commit:** `tool@1234abc`",
      "- **Not read in full:** none",
      "- **Left out:** none",
      "- **Finders:** none; skipped: none",
      "",
    ].join("\n");

    const rendered = renderSlopAudit(audit);
    assert.equal(rendered, expected);
    assert.doesNotMatch(rendered, /## Findings/);
    assert.doesNotMatch(rendered, /## Design/);
    assert.doesNotMatch(rendered, /## Code/);
    assert.doesNotMatch(rendered, /## Cleanup/);
    assert.doesNotMatch(rendered, /## Also noticed/);
  });

  it("renders all 9 sections in exact order with all optional finding, cleanup, and alsoNoticed fields", () => {
    const audit = SlopAuditSchema.parse({
      tldr: "Most of this 46,000-line repo is earned. Notification retries (~410 lines) are the biggest weight that isn't.",
      findings: [
        "**Incomplete read:** `src/Cases/Reports/PdfLayout.cs` was not read in full.",
        "**Data loss bug (kept by verifier):** failed CSV row write is swallowed (`src/Cases/Export/CsvWriter.cs:58`).",
      ],
      needsFromYou: [
        {
          item: "**D1: drop the retry machinery?**",
          rec: "**yes**, once you accept losing in-flight sends at a deploy",
        },
        {
          item: "Choose which code findings to take on, then run `/spec` in this conversation.",
        },
      ],
      weightMap: [
        {
          capability: "Case search",
          lines: 1100,
          sharePct: 16,
          status: "earned",
          earnedWhy: "main screen users work from",
        },
        {
          capability: "Notification retries",
          lines: 410,
          sharePct: 6,
          status: "finding",
          findingId: "D1",
        },
      ],
      design: [
        {
          id: "D1",
          sign: 13,
          kind: "judgement",
          risk: "med",
          where: "`src/Cases/Jobs/`",
          what: "Hand-built job host and lease table.",
          replaceWith: "hand to the host with a retry policy in `Notifier.cs`",
          removes: "about 410 lines",
          usersLose: "in-flight sends are not retried across restarts",
          proof: "410 lines in 3 files; commit `4f2a9c1` added the lease table.",
          against: "A deploy mid-retry loses that send.",
          verifierAdds: "the app restarts about weekly.",
          protectedBy: "`NotifierTests.SendFailure_IsRetried`",
          hunterNotes: ["Confirmed in api area.", "Priced at 410 lines."],
        },
      ],
      code: [
        {
          id: "#1",
          sign: 1,
          kind: "proven",
          risk: "low",
          where: "`src/Cases/Util/Slugger.cs:1-40`",
          what: "Hand-rolled slugger.",
          replaceWith: "Slugify.NET 3.2",
          removes: "40 lines",
          usersLose: "none",
          proof: "Slugify.NET 3.2 is already referenced.",
          verifierAdds: "Confirmed transitive dependency is pinned in lockfile.",
          protectedBy: "none",
          mootIf: "D1",
          unverified: true,
          raisedByVerifier: true,
          hunterNotes: ["Single caller in Jobs."],
        },
      ],
      cleanup: [
        {
          id: "#2",
          where: "src/Web/utils/old.ts:12",
          what: "Unused import",
          replaceWith: "delete",
        },
        {
          where: "src/Web/utils/dead.ts:5",
          what: "Unreferenced helper",
          replaceWith: "delete",
        },
      ],
      alsoNoticed: [
        {
          where: "src/Cases/Export/CsvWriter.cs:58",
          what: "failed row write is swallowed",
          tag: "data-loss",
          verification: "kept",
        },
        {
          where: "src/Cases/Auth/Guard.cs:19",
          what: "tenant check skipped on bulk route",
          tag: "security",
          verification: "kept",
        },
        {
          where: "src/Cases/Ui/Date.ts:7",
          what: "off-by-one month label",
          verification: "unchecked",
        },
      ],
      hunted: {
        repo: "cases",
        head: "801310e",
        notReadInFull: ["src/Cases/Reports/PdfLayout.cs"],
        leftOut: ["src/Cases/Seed/countries.json"],
        findersRun: ["knip", "jscpd"],
        skipped: [{ name: "dotnet format", why: "solution not restored" }],
      },
    });

    const rendered = renderSlopAudit(audit);
    const headings = [
      "## TLDR",
      "## Findings",
      "## Needs from you",
      "## Weight map",
      "## Design",
      "## Code",
      "## Cleanup",
      "## Also noticed",
      "## Hunted",
    ];
    let lastIndex = -1;
    for (const heading of headings) {
      const idx = rendered.indexOf(heading);
      assert.ok(idx > lastIndex, `expected ${heading} after index ${lastIndex}`);
      lastIndex = idx;
    }

    assert.match(
      rendered,
      /1\. \*\*D1: drop the retry machinery\?\*\* \(rec: \*\*yes\*\*, once you accept losing in-flight sends at a deploy\)/,
    );
    assert.match(
      rendered,
      /- \*\*Case search\*\* — 1,100 lines \(16%\) — earned: main screen users work from/,
    );
    assert.match(rendered, /- \*\*Notification retries\*\* — 410 lines \(6%\) — \*\*D1\*\*/);
    assert.match(
      rendered,
      /- \*\*Against:\*\* A deploy mid-retry loses that send\. Verifier adds: the app restarts about weekly\./,
    );
    assert.match(
      rendered,
      /- \*\*Hunter notes:\*\*\n  - Confirmed in api area\.\n  - Priced at 410 lines\./,
    );
    assert.match(
      rendered,
      /### #1 · sign 1 · proven · risk low · moot if D1 lands \(unverified\) \(raised by the verifier\)/,
    );
    assert.match(rendered, /- \*\*Hunter notes:\*\* Single caller in Jobs\./);
    assert.match(
      rendered,
      /- \*\*Verifier adds:\*\* Confirmed transitive dependency is pinned in lockfile\./,
    );
    assert.match(
      rendered,
      /- #2 `src\/Web\/utils\/old\.ts:12` — Unused import \(replace with: delete\)/,
    );
    assert.match(
      rendered,
      /- `src\/Web\/utils\/dead\.ts:5` — Unreferenced helper \(replace with: delete\)/,
    );
    assert.match(
      rendered,
      /- `src\/Cases\/Export\/CsvWriter\.cs:58` — failed row write is swallowed \(data loss, kept by a verifier\)/,
    );
    assert.match(
      rendered,
      /- `src\/Cases\/Auth\/Guard\.cs:19` — tenant check skipped on bulk route \(security, kept by a verifier\)/,
    );
    assert.match(rendered, /- `src\/Cases\/Ui\/Date\.ts:7` — off-by-one month label \(unchecked\)/);
    assert.match(rendered, /- \*\*Commit:\*\* `cases@801310e`/);
    assert.match(
      rendered,
      /- \*\*Finders:\*\* `knip`, `jscpd`; skipped: `dotnet format` \(solution not restored\)/,
    );
  });

  it("renders top 25 code findings in full and groups remaining code findings as bullets by sign", () => {
    const code = Array.from({ length: 28 }, (_, index) => {
      const num = index + 1;
      const sign = num === 26 ? 9 : num === 27 ? 3 : num === 28 ? 9 : 2;
      return {
        id: `#${num}`,
        sign,
        kind: "proven" as const,
        risk: "low" as const,
        where: `src/f${num}.ts:1`,
        what: `Finding ${num}`,
        replaceWith: "delete",
        removes: `${num} lines`,
        usersLose: "none",
        proof: "Checked.",
        protectedBy: "typecheck",
        ...(num === 26 ? { mootIf: "D1", unverified: true } : {}),
        ...(num === 28 ? { raisedByVerifier: true } : {}),
      };
    });

    const audit = SlopAuditSchema.parse({
      tldr: "28 code findings.",
      needsFromYou: [{ item: "Pick findings to fix." }],
      weightMap: [
        {
          capability: "App",
          lines: 5000,
          sharePct: 100,
          status: "earned",
          earnedWhy: "Main app",
        },
      ],
      code,
      hunted: {
        repo: "app",
        head: "deadbeef",
      },
    });

    const rendered = renderSlopAudit(audit);
    assert.match(rendered, /### #25 · sign 2 · proven · risk low/);
    assert.doesNotMatch(rendered, /### #26 ·/);
    assert.doesNotMatch(rendered, /### #27 ·/);
    assert.doesNotMatch(rendered, /### #28 ·/);

    const sign3Index = rendered.indexOf("### Sign 3");
    const sign9Index = rendered.indexOf("### Sign 9");
    assert.ok(sign3Index > 0, "expected ### Sign 3 heading");
    assert.ok(sign9Index > sign3Index, "expected ### Sign 9 after ### Sign 3");
    assert.match(rendered, /- \*\*#27\*\* \(src\/f27\.ts:1\) — Finding 27/);
    assert.match(
      rendered,
      /- \*\*#26\*\* \(src\/f26\.ts:1\) — Finding 26 Replace with: delete\. Removes: 26 lines\. \(proven; risk low; moot if D1 lands; unverified\)/,
    );
    assert.match(
      rendered,
      /- \*\*#28\*\* \(src\/f28\.ts:1\) — Finding 28 Replace with: delete\. Removes: 28 lines\. \(proven; risk low; raised by the verifier\)/,
    );
  });
});
