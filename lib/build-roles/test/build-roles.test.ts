import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  buildRoles,
  checkCitations,
  checkRuleFormat,
  githubHeadingSlugs,
} from "../src/build-roles.ts";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../..");

const VALID_RULE = [
  "## Keep it simple",
  "",
  "**Law:** Keep the rule simple.",
  "",
  "**When:** Writing any rule.",
  "",
  "Bad: Complicating it.",
  "Good: Keeping it simple.",
  "",
].join("\n");

const createSyntheticRepo = (
  mutate?: (dir: string) => void,
): { dir: string; cleanup: () => void } => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "build-roles-test-"));
  const write = (relPath: string, content: string): void => {
    const full = path.join(dir, relPath);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content, "utf8");
  };

  write(
    "skills/meridian/references/rules-core.list",
    [
      "core/laws.md",
      "core/backend-laws.md",
      "core/frontend-laws.md",
      "core/keep-it-simple.md",
      "",
    ].join("\n"),
  );
  write("skills/meridian/references/rules/core/keep-it-simple.md", VALID_RULE);

  write(
    "skills/spec/roles/roles.list",
    "role cold-reader core cold-reader/head,cold-reader/keep-it-simple\n",
  );
  write("skills/spec/roles/cold-reader/head.md", "# Cold reader\n\nIntro prose.\n");
  write("skills/spec/roles/cold-reader/keep-it-simple.md", VALID_RULE);

  write(
    "skills/oracle/kinds/kinds.list",
    ["kind cli head", "kind browser head,track-unplaced-call-sites", ""].join("\n"),
  );
  write("skills/oracle/kinds/cli/head.md", "# CLI kind\n\nCLI intro.\n");
  write("skills/oracle/kinds/browser/head.md", "# Browser kind\n\nBrowser intro.\n");
  write(
    "skills/oracle/kinds/browser/track-unplaced-call-sites.md",
    [
      "## Track unplaced call sites",
      "",
      "**Default:** Track every call site.",
      "",
      "**When:** Filling a browser oracle.",
      "",
      "Bad: Dropping call sites.",
      "Good: Recording every call site.",
      "",
    ].join("\n"),
  );

  if (mutate) {
    mutate(dir);
  }

  return {
    dir,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
};

describe("githubHeadingSlugs", () => {
  it("matches the GitHub slugger self-test cases", () => {
    const md = [
      "## Provide / Inject Pattern",
      "## Framework state (`useState`)",
      "## Naming",
      "## Naming",
    ].join("\n");
    assert.deepEqual(githubHeadingSlugs(md), [
      "provide--inject-pattern",
      "framework-state-usestate",
      "naming",
      "naming-1",
    ]);
  });

  it("strips Markdown links, HTML tags, and emphasis markers", () => {
    const md = "## Use [Zod](https://zod.dev) <span>now</span> *please*";
    assert.deepEqual(githubHeadingSlugs(md), ["use-zod-now-please"]);
  });
});

describe("checkRuleFormat", () => {
  it("accepts a valid five-part rule with and without Links", () => {
    assert.equal(checkRuleFormat(VALID_RULE, "keep-it-simple.md"), null);
    const withLinks = `${VALID_RULE}Links: https://example.com\n`;
    assert.equal(checkRuleFormat(withLinks, "keep-it-simple.md"), null);
  });

  it("rejects bad line 1, line 2, line 3, line 5", () => {
    assert.match(
      checkRuleFormat("# Wrong heading\n\n**Law:** X\n", "wrong-heading.md") ?? "",
      /line 1 is not/,
    );
    assert.match(
      checkRuleFormat("## Keep it simple\nnot blank\n**Law:** X\n", "keep-it-simple.md") ?? "",
      /line 2 is not blank/,
    );
    assert.match(
      checkRuleFormat("## Keep it simple\n\nJust prose.\n", "keep-it-simple.md") ?? "",
      /line 3 does not start with/,
    );
    assert.match(
      checkRuleFormat(
        "## Keep it simple\n\n**Law:** X.\n\nNo when line.\n\nBad: A\nGood: B\n",
        "keep-it-simple.md",
      ) ?? "",
      /line 5 does not start with/,
    );
  });

  it("rejects URLs outside the Links line", () => {
    const inBody = [
      "## Keep it simple",
      "",
      "**Law:** Keep it simple.",
      "",
      "**When:** Always.",
      "",
      "Bad: See https://example.com for why.",
      "Good: Do it cleanly.",
      "",
    ].join("\n");
    assert.match(checkRuleFormat(inBody, "keep-it-simple.md") ?? "", /line 7 holds a URL/);

    const inLine3 = VALID_RULE.replace("Keep the rule simple.", "See https://example.com.");
    assert.match(checkRuleFormat(inLine3, "keep-it-simple.md") ?? "", /line 3 holds a URL/);

    const inLine5 = VALID_RULE.replace("Writing any rule.", "See https://example.com.");
    assert.match(checkRuleFormat(inLine5, "keep-it-simple.md") ?? "", /line 5 holds a URL/);
  });

  it("rejects Good before Bad", () => {
    const reversed = [
      "## Keep it simple",
      "",
      "**Law:** Keep it simple.",
      "",
      "**When:** Always.",
      "",
      "Good: First.",
      "Bad: Second.",
      "",
    ].join("\n");
    assert.match(checkRuleFormat(reversed, "keep-it-simple.md") ?? "", /`Good:` before `Bad:`/);
  });

  it("rejects an extra heading outside code blocks but allows headings inside code blocks", () => {
    const extraHeading = `${VALID_RULE}\n### Extra\n`;
    assert.match(checkRuleFormat(extraHeading, "keep-it-simple.md") ?? "", /is a heading/);

    const headingInCode = `${VALID_RULE}\n\`\`\`md\n### Inside code\n\`\`\`\n`;
    assert.equal(checkRuleFormat(headingInCode, "keep-it-simple.md"), null);
  });

  it("rejects titles whose slug has a double hyphen", () => {
    const doubleHyphen = VALID_RULE.replace("## Keep it simple", "## Provide / Inject Pattern");
    assert.match(
      checkRuleFormat(doubleHyphen, "provide-inject-pattern.md") ?? "",
      /has a double hyphen/,
    );
  });

  it("rejects filenames that do not match the title slug", () => {
    assert.match(
      checkRuleFormat(VALID_RULE, "wrong-name.md") ?? "",
      /must be the slug of the title, keep-it-simple\.md/,
    );
  });
});

describe("checkCitations", () => {
  it("reports missing rule files and missing heading slugs", () => {
    const { dir, cleanup } = createSyntheticRepo();
    try {
      const rulesDir = path.join(dir, "skills/meridian/references/rules");
      const content = [
        "Valid: `core/keep-it-simple.md` and `core/keep-it-simple.md#keep-it-simple`.",
        "Missing file: `core/does-not-exist.md`.",
        "Missing slug: `core/keep-it-simple.md#no-such-heading`.",
      ].join("\n");
      const errors = checkCitations(content, "README.md", rulesDir, ["core"]);
      assert.equal(errors.length, 2);
      assert.match(errors[0] ?? "", /cites core\/does-not-exist\.md, and no rule file/);
      assert.match(
        errors[1] ?? "",
        /cites core\/keep-it-simple\.md#no-such-heading, and core\/keep-it-simple\.md has no heading/,
      );
    } finally {
      cleanup();
    }
  });
});

describe("buildRoles", () => {
  it("passes on the real repository clean tree with zero writes", () => {
    const result = buildRoles(REPO_ROOT);
    assert.equal(result.exitCode, 0, result.errors.join("\n"));
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.written, []);
  });

  it("skips writing unchanged files on a second run", () => {
    const { dir, cleanup } = createSyntheticRepo();
    try {
      const first = buildRoles(dir);
      assert.equal(first.exitCode, 0, first.errors.join("\n"));
      assert.ok(first.written.length > 0);

      const second = buildRoles(dir);
      assert.equal(second.exitCode, 0, second.errors.join("\n"));
      assert.deepEqual(second.written, []);
    } finally {
      cleanup();
    }
  });

  it("rejects a flat .md file directly under roles/ even when referenced in roles.list", () => {
    const { dir, cleanup } = createSyntheticRepo((root) => {
      writeFileSync(path.join(root, "skills/spec/roles/flat-role.md"), "# Flat\n\nProse.\n");
      writeFileSync(
        path.join(root, "skills/spec/roles/roles.list"),
        "role cold-reader core cold-reader/head,cold-reader/keep-it-simple,flat-role\n",
      );
    });
    try {
      const result = buildRoles(dir);
      assert.equal(result.exitCode, 1);
      assert.ok(
        result.errors.some((e) =>
          e.includes(
            "skills/spec/roles/flat-role.md: role parts must live in a subfolder under roles/",
          ),
        ),
        result.errors.join("\n"),
      );
    } finally {
      cleanup();
    }
  });

  it("rejects a role rule file breaking the five-part format", () => {
    const { dir, cleanup } = createSyntheticRepo((root) => {
      writeFileSync(
        path.join(root, "skills/spec/roles/cold-reader/keep-it-simple.md"),
        "## Broken rule\n\nJust prose with no strength line, When, Bad, or Good.\n",
      );
    });
    try {
      const result = buildRoles(dir);
      assert.equal(result.exitCode, 1);
      assert.ok(
        result.errors.some((e) =>
          e.includes("skills/spec/roles/cold-reader/keep-it-simple.md: line 3 does not start with"),
        ),
        result.errors.join("\n"),
      );
    } finally {
      cleanup();
    }
  });

  it("rejects a cross-kind orphan part under kinds/cli/ whose name appears in browser", () => {
    const { dir, cleanup } = createSyntheticRepo((root) => {
      writeFileSync(
        path.join(root, "skills/oracle/kinds/cli/track-unplaced-call-sites.md"),
        [
          "## Track unplaced call sites",
          "",
          "**Default:** Track every call site.",
          "",
          "**When:** Filling a CLI oracle.",
          "",
          "Bad: Dropping call sites.",
          "Good: Recording every call site.",
          "",
        ].join("\n"),
      );
    });
    try {
      const result = buildRoles(dir);
      assert.equal(result.exitCode, 1);
      assert.ok(
        result.errors.some((e) =>
          e.includes(
            "skills/oracle/kinds/cli/track-unplaced-call-sites.md: no line in kinds.list uses it",
          ),
        ),
        result.errors.join("\n"),
      );
    } finally {
      cleanup();
    }
  });

  it("rejects an orphaned generated kinds/orphan.md file", () => {
    const { dir, cleanup } = createSyntheticRepo((root) => {
      writeFileSync(path.join(root, "skills/oracle/kinds/orphan.md"), "# Orphan kind\n");
    });
    try {
      const result = buildRoles(dir);
      assert.equal(result.exitCode, 1);
      assert.ok(
        result.errors.some((e) =>
          e.includes("skills/oracle/kinds/orphan.md: no line in kinds.list builds it"),
        ),
        result.errors.join("\n"),
      );
    } finally {
      cleanup();
    }
  });

  it("warns without failing when a generated file is over 40,000 bytes (even over 60,000 bytes)", () => {
    const { dir, cleanup } = createSyntheticRepo((root) => {
      writeFileSync(
        path.join(root, "skills/oracle/kinds/cli/head.md"),
        `# CLI kind\n\n${"x".repeat(61_000)}\n`,
      );
    });
    try {
      const result = buildRoles(dir);
      assert.equal(result.exitCode, 0, result.errors.join("\n"));
      assert.deepEqual(result.errors, []);
      assert.ok(
        result.warnings.some(
          (w) => w.includes("skills/oracle/kinds/cli.md:") && w.includes("over 40000"),
        ),
        result.warnings.join("\n"),
      );
    } finally {
      cleanup();
    }
  });

  it("rejects unlisted and duplicate rule list membership", () => {
    const { dir, cleanup } = createSyntheticRepo((root) => {
      writeFileSync(
        path.join(root, "skills/meridian/references/rules/core/orphan-rule.md"),
        VALID_RULE.replace("## Keep it simple", "## Orphan rule"),
      );
      writeFileSync(
        path.join(root, "skills/meridian/references/rules-extra.list"),
        "core/keep-it-simple.md\n",
      );
    });
    try {
      const result = buildRoles(dir);
      assert.equal(result.exitCode, 1);
      assert.ok(
        result.errors.some((e) => e.includes("core/orphan-rule.md: in 0 lists")),
        result.errors.join("\n"),
      );
      assert.ok(
        result.errors.some((e) => e.includes("core/keep-it-simple.md: in 2 lists")),
        result.errors.join("\n"),
      );
    } finally {
      cleanup();
    }
  });

  it("expands <!-- schema: Name --> placeholders preserving indentation", () => {
    const { dir, cleanup } = createSyntheticRepo((root) => {
      writeFileSync(
        path.join(root, "skills/spec/roles/cold-reader/head.md"),
        "# Cold reader\n\n   <!-- schema: GoCriticReportSchema -->\n",
      );
    });
    try {
      const result = buildRoles(dir);
      assert.equal(result.exitCode, 0, result.errors.join("\n"));
      const generated = readFileSync(
        path.join(dir, "skills/spec/references/cold-reader.md"),
        "utf8",
      );
      assert.match(generated, /\n   ```yaml\n   # Strict YAML/);
      assert.match(generated, /\n   verdict: PASS \| FAIL\n/);
      assert.doesNotMatch(generated, /GoCriticReportSchema/);
    } finally {
      cleanup();
    }
  });

  it("rejects unknown <!-- schema: ... --> names and bare *Schema symbol leaks", () => {
    const { dir, cleanup } = createSyntheticRepo((root) => {
      writeFileSync(
        path.join(root, "skills/spec/roles/cold-reader/head.md"),
        "# Cold reader\n\nMatching `FakeReportSchema`.\n\n<!-- schema: MissingSchema -->\n",
      );
    });
    try {
      const result = buildRoles(dir);
      assert.equal(result.exitCode, 1);
      assert.ok(
        result.errors.some((e) =>
          e.includes("skills/spec/roles/cold-reader/head.md: names unknown schema 'MissingSchema'"),
        ),
        result.errors.join("\n"),
      );
      assert.ok(
        result.errors.some((e) =>
          e.includes(
            "skills/spec/references/cold-reader.md: references internal symbol 'FakeReportSchema'",
          ),
        ),
        result.errors.join("\n"),
      );
    } finally {
      cleanup();
    }
  });
});
