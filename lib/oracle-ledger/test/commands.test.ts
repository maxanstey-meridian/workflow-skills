import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  collectCandidateFiles,
  loadOracleFiles,
  readJsonFile,
  readJUnitFiles,
  readTypedYamlFile,
  resolveTestFile,
  writeJsonAtomic,
} from "../src/io.ts";
import { ClaimsFileSchema, OracleConfSchema, RunStateSchema } from "../src/schema.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEDGER_MJS = path.resolve(__dirname, "../../../skills/oracle/scripts/ledger.mjs");

const tmpDirs: string[] = [];

const makeTempDir = (prefix: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `oracle-${prefix}-`));
  tmpDirs.push(dir);
  return dir;
};

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const runLedger = (
  args: string[],
  cwd?: string,
): { status: number | null; stdout: string; stderr: string } => {
  const res = spawnSync(process.execPath, [LEDGER_MJS, ...args], {
    cwd,
    encoding: "utf8",
  });
  return {
    status: res.status,
    stdout: res.stdout,
    stderr: res.stderr,
  };
};

const writeJson = (filePath: string, data: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const writeYaml = (filePath: string, data: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, YAML.stringify(data, { lineWidth: 0 }), "utf8");
};

const makeJUnitXml = (
  cases: Array<{
    name: string;
    file?: string;
    outcome: "green" | "red" | "skipped" | "error";
  }>,
): string => {
  const body = cases
    .map((c) => {
      const fileAttr = c.file ? ` file="${c.file}"` : "";
      if (c.outcome === "red") {
        return `  <testcase name="${c.name}"${fileAttr}><failure message="boom"/></testcase>`;
      }
      if (c.outcome === "skipped") {
        return `  <testcase name="${c.name}"${fileAttr}><skipped/></testcase>`;
      }
      if (c.outcome === "error") {
        return `  <testcase name="${c.name}"${fileAttr}><error message="crash"/></testcase>`;
      }
      return `  <testcase name="${c.name}"${fileAttr}/>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<testsuites>\n<testsuite name="suite">\n${body}\n</testsuite>\n</testsuites>\n`;
};

describe("freeze", () => {
  it("exits 2 when --words is empty or whitespace", () => {
    const dir = makeTempDir("freeze-words");
    fs.writeFileSync(path.join(dir, "rows.mjs"), "console.log('{}');\n");
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });

    const res = runLedger(["freeze", dir, "--words", "   "]);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /--words must be non-empty/);
  });

  it("exits 2 when the row script file does not exist", () => {
    const dir = makeTempDir("freeze-missing");
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "missing.mjs"],
    });

    const res = runLedger(["freeze", dir, "--words", "CLI scope"]);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /could not resolve an existing row script file/);
  });

  it("writes frozen.json with script sha256 on valid input", () => {
    const dir = makeTempDir("freeze-valid");
    fs.writeFileSync(path.join(dir, "rows.mjs"), "console.log('');\n");
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });

    const res = runLedger(["freeze", dir, "--words", "CLI scope"]);
    assert.equal(res.status, 0);

    const frozen = JSON.parse(fs.readFileSync(path.join(dir, "frozen.json"), "utf8"));
    assert.equal(frozen.words, "CLI scope");
    assert.deepEqual(frozen.command, ["node", "rows.mjs"]);
    assert.equal(frozen.script.file, "rows.mjs");
    assert.match(frozen.script.sha256, /^[a-f0-9]{64}$/);
  });
});

describe("rows", () => {
  it("refuses to run without freeze unless --draft is passed, and refuses script drift", () => {
    const dir = makeTempDir("rows-drift");
    const scriptPath = path.join(dir, "rows.mjs");
    fs.writeFileSync(scriptPath, 'console.log(JSON.stringify({ id: "op_a", slice: "core" }));\n');
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });

    const beforeFreeze = runLedger(["rows", dir]);
    assert.equal(beforeFreeze.status, 1);

    const draftRun = runLedger(["rows", dir, "--draft"]);
    assert.equal(draftRun.status, 0);

    assert.equal(runLedger(["freeze", dir, "--words", "core"]).status, 0);
    assert.equal(runLedger(["rows", dir]).status, 0);

    // Mutate oracle.conf.json rows command after freeze -> must refuse with exit 1
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs", "--extra"],
    });
    const cmdDrifted = runLedger(["rows", dir]);
    assert.equal(cmdDrifted.status, 1);
    assert.match(cmdDrifted.stderr, /oracle\.conf\.json rows command drifted from frozen\.json/);

    // Restore command, then mutate script bytes after freeze -> must refuse with exit 1
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    fs.appendFileSync(scriptPath, "// drift\n");
    const drifted = runLedger(["rows", dir]);
    assert.equal(drifted.status, 1);
    assert.match(drifted.stderr, /row script bytes drifted from frozen\.json/);
  });

  it("syncs key-preservingly, marks vanished rows gone, records unplaced, and appends uiStates", () => {
    const dir = makeTempDir("rows-sync");
    const scriptPath = path.join(dir, "rows.mjs");
    fs.writeFileSync(
      scriptPath,
      [
        'console.error("diagnostic stderr line");',
        'console.log(JSON.stringify({ id: "save_ok", slice: "form", where: "Save.cs:10" }));',
        'console.log(JSON.stringify({ id: "old_row", slice: "form" }));',
        'console.log(JSON.stringify({ id: "mystery_call", unplaced: "dynamic route", slice: "form", where: "app.ts:9" }));',
      ].join("\n"),
    );
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "browser",
      rows: ["node", "rows.mjs"],
      uiStates: [{ id: "empty_banner", slice: "form", when: "User opens form with zero items" }],
    });

    const firstSync = runLedger(["rows", dir, "--draft"]);
    assert.equal(firstSync.status, 0);
    assert.match(firstSync.stderr, /diagnostic stderr line/);

    const yamlPath = path.join(dir, "form.oracle.yaml");
    const doc1 = YAML.parse(fs.readFileSync(yamlPath, "utf8"));
    assert.equal(doc1.kind, "browser");
    assert.equal(doc1.rows.length, 3);
    assert.equal(doc1.unplaced.length, 1);
    assert.equal(doc1.unplaced[0].id, "mystery_call");

    // Human fills save_ok
    doc1.rows[0].when = "User submits valid form";
    doc1.rows[0].expect = { ui: "Shows saved toast", api: "200 OK" };
    doc1.rows[0].source = "written";
    writeYaml(yamlPath, doc1);

    // Second run drops old_row and keeps save_ok
    fs.writeFileSync(
      scriptPath,
      'console.log(JSON.stringify({ id: "save_ok", slice: "form", where: "Save.cs:12" }));\n',
    );
    assert.equal(runLedger(["rows", dir, "--draft"]).status, 0);

    const doc2 = YAML.parse(fs.readFileSync(yamlPath, "utf8"));
    const saveOk = doc2.rows.find((r: { id: string }) => r.id === "save_ok");
    const oldRow = doc2.rows.find((r: { id: string }) => r.id === "old_row");
    assert.equal(saveOk.where, "Save.cs:12");
    assert.equal(saveOk.when, "User submits valid form");
    assert.deepEqual(saveOk.expect, { ui: "Shows saved toast", api: "200 OK" });
    assert.equal(saveOk.source, "written");
    assert.equal(oldRow.gone, true);
    assert.equal(doc2.unplaced[0].gone, true);
  });

  it("exits 2 on normalised-ID collisions", () => {
    const dir = makeTempDir("rows-collision");
    fs.writeFileSync(
      path.join(dir, "rows.mjs"),
      [
        'console.log(JSON.stringify({ id: "create-user" }));',
        'console.log(JSON.stringify({ id: "Create_User" }));',
      ].join("\n"),
    );
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "api-contract",
      rows: ["node", "rows.mjs"],
    });

    const res = runLedger(["rows", dir, "--draft"]);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /normalised-ID collision/);
  });
});

describe("validate", () => {
  it("rejects uiStates on non-browser oracle.conf.json", () => {
    const dir = makeTempDir("val-conf");
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
      uiStates: [{ id: "s1", when: "bad" }],
    });
    const res = runLedger(["validate", dir]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /uiStates is only allowed when kind is "browser"/);
  });

  it("rejects kind mismatch between oracle.conf.json and YAML", () => {
    const dir = makeTempDir("val-kind");
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "browser",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "cli",
      slice: "s",
      rows: [],
    });

    const res = runLedger(["validate", dir]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /does not match oracle\.conf\.json kind/);
  });

  it("enforces browser expect.ui, unanswered question on active, shortfall text, and non-active reason", () => {
    const dir = makeTempDir("val-rules");
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "browser",
      rows: ["node", "rows.mjs"],
    });

    // Valid: active with question can have null expect & source
    writeYaml(path.join(dir, "page.oracle.yaml"), {
      kind: "browser",
      slice: "page",
      rows: [
        {
          id: "q_row",
          status: "active",
          when: null,
          expect: null,
          source: null,
          shortfall: null,
          reason: null,
          question: { ask: "Should it redirect?", recommend: "Yes, to /home" },
        },
        {
          id: "ok_row",
          status: "active",
          when: "User clicks Save",
          expect: { ui: "Saved banner appears" },
          source: "ruling",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["validate", dir]).status, 0);

    // Invalid: browser active missing expect.ui, shortfall missing text, other-level missing reason
    writeYaml(path.join(dir, "page.oracle.yaml"), {
      kind: "browser",
      slice: "page",
      rows: [
        {
          id: "missing_ui",
          status: "active",
          when: "User clicks Save",
          expect: { ui: "   " },
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "bad_shortfall",
          status: "shortfall",
          when: "User clicks Export",
          expect: { ui: "CSV downloads" },
          source: "ruling",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "bad_other",
          status: "other-level",
          when: null,
          expect: null,
          source: null,
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "shortfall_with_question",
          status: "shortfall",
          when: "User clicks Export",
          expect: { ui: "CSV downloads" },
          source: "ruling",
          shortfall: "Export button does nothing",
          reason: null,
          question: { ask: "Still open?", recommend: "Yes" },
        },
        {
          id: "struck_with_shortfall",
          status: "struck",
          when: null,
          expect: null,
          source: null,
          shortfall: "Leftover shortfall text",
          reason: "Retired in v2",
          question: null,
        },
      ],
    });
    const res = runLedger(["validate", dir]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /missing_ui.*non-empty expect\.ui/);
    assert.match(res.stderr, /bad_shortfall.*non-empty shortfall/);
    assert.match(res.stderr, /bad_other.*non-empty reason/);
    assert.match(res.stderr, /shortfall_with_question.*shortfall row must have question: null/);
    assert.match(res.stderr, /struck_with_shortfall.*struck row must have shortfall: null/);
  });

  it("rejects gitignored, nonexistent, .plans/, parenthesised, and missing sourceRef on written rows", () => {
    const repoDir = makeTempDir("source-ref-git");
    assert.equal(spawnSync("git", ["init", "-q"], { cwd: repoDir }).status, 0);
    fs.writeFileSync(path.join(repoDir, ".gitignore"), "scratch.md\nignored-dir/\n", "utf8");
    fs.writeFileSync(path.join(repoDir, "scratch.md"), "# scratch\n", "utf8");
    fs.mkdirSync(path.join(repoDir, "ignored-dir"), { recursive: true });
    fs.writeFileSync(path.join(repoDir, "ignored-dir", "spec.md"), "# ignored\n", "utf8");
    fs.mkdirSync(path.join(repoDir, "docs"), { recursive: true });
    fs.writeFileSync(path.join(repoDir, "docs", "spec.md"), "# spec\n", "utf8");
    fs.mkdirSync(path.join(repoDir, "test"), { recursive: true });
    fs.writeFileSync(path.join(repoDir, "test", "e2e.test.ts"), "// test\n", "utf8");
    const caseDir = path.join(repoDir, "__oracle__", "demo");
    fs.mkdirSync(caseDir, { recursive: true });
    writeJson(path.join(caseDir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });

    // Rejects gitignored sourceRef (both repo-relative and case-relative), missing file, directory, and missing sourceRef on written
    writeYaml(path.join(caseDir, "core.oracle.yaml"), {
      kind: "cli",
      slice: "core",
      rows: [
        {
          id: "ignored_root",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          sourceRef: "scratch.md#L1",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "ignored_nested",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          sourceRef: "../../ignored-dir/spec.md:10",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "missing_file",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          sourceRef: "docs/nonexistent.md",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "dir_ref",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          sourceRef: "docs",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "test_file_ref",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          sourceRef: "test/e2e.test.ts:1",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "missing_ref",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });

    const valRes = runLedger(["validate", caseDir]);
    assert.equal(valRes.status, 1);
    assert.match(valRes.stderr, /ignored_root.*is gitignored/);
    assert.match(valRes.stderr, /ignored_nested.*is gitignored/);
    assert.match(valRes.stderr, /missing_file.*does not exist on disk/);
    assert.match(valRes.stderr, /dir_ref.*does not exist on disk/);
    assert.match(valRes.stderr, /test_file_ref.*is a test file/);
    assert.match(valRes.stderr, /missing_ref.*requires sourceRef/);

    const lockRes = runLedger(["lock", caseDir]);
    assert.equal(lockRes.status, 1);
    assert.match(lockRes.stderr, /ignored_root.*is gitignored/);
    assert.match(lockRes.stderr, /missing_file.*does not exist on disk/);

    // Rejects .plans/ and parenthesised sourceRef at schema parse time
    writeYaml(path.join(caseDir, "core.oracle.yaml"), {
      kind: "cli",
      slice: "core",
      rows: [
        {
          id: "plans_ref",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          sourceRef: ".plans/spec-foo.yaml",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "parens_ref",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          sourceRef: "docs/spec.md (section 2)",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    const badFormatRes = runLedger(["validate", caseDir]);
    assert.equal(badFormatRes.status, 1);
    assert.match(badFormatRes.stderr, /\.plans\//);
    assert.match(badFormatRes.stderr, /without whitespace or parentheses/);

    // Accepts existing non-ignored repo-relative path, URL, and meridian skill rule path
    writeYaml(path.join(caseDir, "core.oracle.yaml"), {
      kind: "cli",
      slice: "core",
      rows: [
        {
          id: "ok_doc",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          sourceRef: "docs/spec.md#ruling-1",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "ok_url",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "written",
          sourceRef: "https://example.com/spec#s1",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "ok_meridian",
          status: "active",
          when: "Runs command",
          expect: "Exits 0",
          source: "meridian",
          sourceRef: "tests/assert-the-intended-behaviour-not-todays-gap.md",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["validate", caseDir]).status, 0);
    assert.equal(runLedger(["lock", caseDir]).status, 0);
  });
});

describe("folded block scalars", () => {
  it("rejects folded block scalars (> and >-) in *.oracle.yaml and claims.yaml", () => {
    const dir = makeTempDir("folded-scalars");
    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir, { recursive: true });
    fs.writeFileSync(path.join(testsDir, "a.test.ts"), 'test("row_a", () => {});\n');

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });

    const oraclePath = path.join(dir, "s.oracle.yaml");
    for (const style of [">", ">-"]) {
      fs.writeFileSync(
        oraclePath,
        [
          "kind: cli",
          "slice: s",
          "rows:",
          "  - id: row_a",
          "    status: active",
          `    when: ${style}`,
          "      User runs the command",
          "    expect: Exits 0",
          "    source: written",
          "    shortfall: null",
          "    reason: null",
          "    question: null",
          "",
        ].join("\n"),
        "utf8",
      );

      const valRes = runLedger(["validate", dir]);
      assert.equal(valRes.status, 1);
      assert.match(valRes.stderr, /Folded block scalars/);

      const lockRes = runLedger(["lock", dir]);
      assert.equal(lockRes.status, 1);
      assert.match(lockRes.stderr, /Folded block scalars/);
    }

    // Write valid oracle YAML, lock, record results, then test folded scalars in claims.yaml
    writeYaml(oraclePath, {
      kind: "cli",
      slice: "s",
      rows: [
        {
          id: "row_a",
          status: "active",
          when: "User runs the command",
          expect: "Exits 0",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const junitPath = path.join(dir, "res.xml");
    fs.writeFileSync(junitPath, makeJUnitXml([{ name: "row_a", outcome: "green" }]));
    assert.equal(runLedger(["results", dir, junitPath, "--tests", testsDir]).status, 0);

    const claimsPath = path.join(dir, "claims.yaml");
    for (const style of [">", ">-"]) {
      fs.writeFileSync(
        claimsPath,
        [
          "claims:",
          "  - id: row_a",
          `    redCondition: ${style}`,
          "      Break the output",
          "",
        ].join("\n"),
        "utf8",
      );
      const verifyRes = runLedger(["verify", dir, claimsPath]);
      assert.equal(verifyRes.status, 1);
      assert.match(verifyRes.stderr, /Folded block scalars/);
    }
  });
});

describe("lock", () => {
  it("refuses unanswered question and unstruck gone row, then writes hashes when clean", () => {
    const dir = makeTempDir("lock-rules");
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });

    writeYaml(path.join(dir, "cli.oracle.yaml"), {
      kind: "cli",
      slice: "cli",
      rows: [
        {
          id: "q_row",
          status: "active",
          when: null,
          expect: null,
          source: null,
          shortfall: null,
          reason: null,
          question: { ask: "What exit code?", recommend: "Exit 2" },
        },
        {
          id: "gone_row",
          gone: true,
          status: "active",
          when: "Old flag",
          expect: "Prints help",
          source: "today",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });

    const bad = runLedger(["lock", dir]);
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /unanswered question/);
    assert.match(bad.stderr, /gone row must be status "struck"/);

    // Resolve question and strike gone_row
    writeYaml(path.join(dir, "cli.oracle.yaml"), {
      kind: "cli",
      slice: "cli",
      rows: [
        {
          id: "q_row",
          status: "active",
          when: "Invalid flag",
          expect: "Exits 2",
          source: "ruling",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "gone_row",
          gone: true,
          status: "struck",
          when: null,
          expect: null,
          source: null,
          shortfall: null,
          reason: "Flag retired in v2",
          question: null,
        },
      ],
    });

    const ok = runLedger(["lock", dir]);
    assert.equal(ok.status, 0);
    const locked = JSON.parse(fs.readFileSync(path.join(dir, "locked.json"), "utf8"));
    assert.match(locked.rows.q_row, /^[a-f0-9]{64}$/);
    assert.match(locked.rows.gone_row, /^[a-f0-9]{64}$/);
  });
});

describe("results, verify, and open", () => {
  it("enforces lock tamper, colour rules, --slice merge, verify claims/hash, and open exit codes", () => {
    const dir = makeTempDir("lifecycle");
    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir, { recursive: true });

    const sliceATest = path.join(testsDir, "a.test.ts");
    const sliceBTest = path.join(testsDir, "b.test.ts");
    fs.writeFileSync(
      sliceATest,
      'test("row_active", () => {});\ntest("row_shortfall", () => {});\n',
    );
    fs.writeFileSync(sliceBTest, 'test("row_b", () => {});\n');

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "a.oracle.yaml"), {
      kind: "cli",
      slice: "a",
      rows: [
        {
          id: "row_active",
          status: "active",
          when: "Valid input",
          expect: "Prints ok",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "row_shortfall",
          status: "shortfall",
          when: "Known bug input",
          expect: "Prints sorted",
          source: "ruling",
          shortfall: "Unsorted output bug",
          reason: null,
          question: null,
        },
      ],
    });
    writeYaml(path.join(dir, "b.oracle.yaml"), {
      kind: "cli",
      slice: "b",
      rows: [
        {
          id: "row_b",
          status: "active",
          when: "Slice B input",
          expect: "Prints b",
          source: "today",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });

    // open fails while unlocked
    assert.equal(runLedger(["open", dir]).status, 1);

    // lock
    assert.equal(runLedger(["lock", dir]).status, 0);

    // results for slice a: green active + red shortfall passes
    const junitA = path.join(dir, "a.xml");
    fs.writeFileSync(
      junitA,
      makeJUnitXml([
        { name: "row_active", outcome: "green" },
        { name: "row_shortfall", outcome: "red" },
      ]),
    );
    assert.equal(
      runLedger(["results", dir, junitA, "--tests", testsDir, "--slice", "a"]).status,
      0,
    );

    // results for slice b preserves slice a in run-state.json
    const junitB = path.join(dir, "b.xml");
    fs.writeFileSync(junitB, makeJUnitXml([{ name: "row_b", outcome: "green" }]));
    assert.equal(
      runLedger(["results", dir, junitB, "--tests", testsDir, "--slice", "b"]).status,
      0,
    );

    const runState = JSON.parse(fs.readFileSync(path.join(dir, "run-state.json"), "utf8"));
    assert.equal(runState.rows.row_active.colour, "green");
    assert.equal(runState.rows.row_shortfall.colour, "red");
    assert.equal(runState.rows.row_b.colour, "green");

    // open still exits 1 while unclaimed
    const openUnclaimed = runLedger(["open", dir]);
    assert.equal(openUnclaimed.status, 1);
    assert.match(openUnclaimed.stdout, /unclaimed/);
    assert.match(openUnclaimed.stdout, /Today \(1\): b:row_b/);

    // verify rejects missing claim
    const claimsPath = path.join(dir, "claims.yaml");
    writeYaml(claimsPath, {
      claims: [{ id: "row_active", redCondition: "Break ok output" }],
    });
    assert.equal(runLedger(["verify", dir, claimsPath]).status, 1);

    // verify rejects empty redCondition
    writeYaml(claimsPath, {
      claims: [
        { id: "row_active", redCondition: "   " },
        { id: "row_shortfall", redCondition: "Fix sort" },
        { id: "row_b", redCondition: "Break b" },
      ],
    });
    assert.equal(runLedger(["verify", dir, claimsPath]).status, 1);

    // verify succeeds with all claims
    writeYaml(claimsPath, {
      claims: [
        { id: "row_active", redCondition: "Break ok output" },
        { id: "row_shortfall", redCondition: "Fix sort bug" },
        { id: "row_b", redCondition: "Break b output" },
      ],
    });
    assert.equal(runLedger(["verify", dir, claimsPath]).status, 0);

    // open now exits 0
    assert.equal(runLedger(["open", dir]).status, 0);

    // Editing a test file after verify makes open exit 1 and verify exit 1
    fs.appendFileSync(sliceATest, "// post-verify edit\n");
    const openAfterEdit = runLedger(["open", dir]);
    assert.equal(openAfterEdit.status, 1);
    assert.match(openAfterEdit.stdout, /test file changed after verify/);

    const verifyStale = runLedger(["verify", dir, claimsPath]);
    assert.equal(verifyStale.status, 1);
    assert.match(verifyStale.stderr, /test file changed on disk since results/);

    // Negative colour checks: red active, green shortfall, skipped, error all fail results
    for (const badOutcomes of [
      [
        { name: "row_active", outcome: "red" as const },
        { name: "row_shortfall", outcome: "red" as const },
      ],
      [
        { name: "row_active", outcome: "green" as const },
        { name: "row_shortfall", outcome: "green" as const },
      ],
      [
        { name: "row_active", outcome: "skipped" as const },
        { name: "row_shortfall", outcome: "red" as const },
      ],
      [
        { name: "row_active", outcome: "error" as const },
        { name: "row_shortfall", outcome: "red" as const },
      ],
    ]) {
      fs.writeFileSync(junitA, makeJUnitXml(badOutcomes));
      assert.equal(
        runLedger(["results", dir, junitA, "--tests", testsDir, "--slice", "a"]).status,
        1,
      );
    }

    // Tampering with locked YAML makes both results and open exit 1
    const yamlA = YAML.parse(fs.readFileSync(path.join(dir, "a.oracle.yaml"), "utf8"));
    yamlA.rows[0].expect = "Tampered expectation";
    writeYaml(path.join(dir, "a.oracle.yaml"), yamlA);

    assert.equal(
      runLedger(["results", dir, junitA, "--tests", testsDir, "--slice", "a"]).status,
      1,
    );
    assert.equal(runLedger(["open", dir]).status, 1);
  });

  it("exits 2 when a matched test file is unresolvable or ambiguous", () => {
    const dir = makeTempDir("resolve");
    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir, { recursive: true });

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "cli",
      slice: "s",
      rows: [
        {
          id: "unique_row",
          status: "active",
          when: "Run",
          expect: "Works",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const junitPath = path.join(dir, "res.xml");
    fs.writeFileSync(junitPath, makeJUnitXml([{ name: "unique_row", outcome: "green" }]));

    // Unresolvable (no file mentions unique_row)
    const missing = runLedger(["results", dir, junitPath, "--tests", testsDir]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /could not resolve test file/);

    // Ambiguous (two files mention unique_row)
    fs.writeFileSync(path.join(testsDir, "one.test.ts"), 'test("unique_row", () => {});\n');
    fs.writeFileSync(path.join(testsDir, "two.test.ts"), 'test("unique_row", () => {});\n');
    const ambig = runLedger(["results", dir, junitPath, "--tests", testsDir]);
    assert.equal(ambig.status, 2);
    assert.match(ambig.stderr, /ambiguous test file/);
  });

  it("enforces browser cheat-lint in results and respects locked allowKeyboard: true", () => {
    const dir = makeTempDir("browser-lint");
    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir, { recursive: true });

    const specPath = path.join(testsDir, "modal.spec.ts");
    fs.writeFileSync(
      specPath,
      'test("close_modal", async () => { await page.keyboard.press("Escape"); });\n',
    );

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "browser",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "modal.oracle.yaml"), {
      kind: "browser",
      slice: "modal",
      rows: [
        {
          id: "close_modal",
          status: "active",
          when: "User presses Escape on open modal",
          expect: { ui: "Modal closes" },
          source: "ruling",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const junitPath = path.join(dir, "modal.xml");
    fs.writeFileSync(junitPath, makeJUnitXml([{ name: "close_modal", outcome: "green" }]));

    // Without allowKeyboard: true -> results fails with exit 1
    const denied = runLedger(["results", dir, junitPath, "--tests", testsDir]);
    assert.equal(denied.status, 1);
    assert.match(denied.stderr, /no-keyboard-press/);

    // Lock with allowKeyboard: true -> results passes with exit 0
    writeYaml(path.join(dir, "modal.oracle.yaml"), {
      kind: "browser",
      slice: "modal",
      rows: [
        {
          id: "close_modal",
          status: "active",
          when: "User presses Escape on open modal",
          expect: { ui: "Modal closes" },
          source: "ruling",
          shortfall: null,
          reason: null,
          question: null,
          allowKeyboard: true,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);
    assert.equal(runLedger(["results", dir, junitPath, "--tests", testsDir]).status, 0);
  });

  it("resolves matched test files from JUnit testcase/@file without --tests matches", () => {
    const dir = makeTempDir("junit-file-attr");
    const emptyTestsDir = path.join(dir, "empty-tests");
    fs.mkdirSync(emptyTestsDir, { recursive: true });

    const absSpec = path.join(dir, "abs.test.ts");
    const relSpec = path.join(dir, "rel.test.ts");
    fs.writeFileSync(absSpec, 'test("abs_row", () => {});\n');
    fs.writeFileSync(relSpec, 'test("rel_row", () => {});\n');

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "cli",
      slice: "s",
      rows: [
        {
          id: "abs_row",
          status: "active",
          when: "Run abs",
          expect: "Passes",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "rel_row",
          status: "active",
          when: "Run rel",
          expect: "Passes",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const junitPath = path.join(dir, "res.xml");
    fs.writeFileSync(
      junitPath,
      makeJUnitXml([
        { name: "abs_row", file: absSpec, outcome: "green" },
        { name: "rel_row", file: "rel.test.ts", outcome: "green" },
      ]),
    );

    const res = runLedger(["results", dir, junitPath, "--tests", emptyTestsDir]);
    assert.equal(res.status, 0);

    const runState = JSON.parse(fs.readFileSync(path.join(dir, "run-state.json"), "utf8"));
    assert.equal(runState.rows.abs_row.testFile, "abs.test.ts");
    assert.equal(runState.rows.rel_row.testFile, "rel.test.ts");
  });

  it("verify rejects wrong colour and cheat-lint findings recorded in run-state.json", () => {
    const dir = makeTempDir("verify-colour-lint");
    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir, { recursive: true });

    fs.writeFileSync(
      path.join(testsDir, "active.spec.ts"),
      'test("row_wrong_colour", async () => {});\n',
    );
    fs.writeFileSync(
      path.join(testsDir, "lint.spec.ts"),
      'test("row_cheat_lint", async () => { await page.waitForTimeout(100); });\n',
    );

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "browser",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "browser",
      slice: "s",
      rows: [
        {
          id: "row_wrong_colour",
          status: "active",
          when: "User clicks Submit",
          expect: { ui: "Shows confirmation" },
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "row_cheat_lint",
          status: "active",
          when: "User waits for dialog",
          expect: { ui: "Dialog appears" },
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const junitPath = path.join(dir, "res.xml");
    fs.writeFileSync(
      junitPath,
      makeJUnitXml([
        { name: "row_wrong_colour", outcome: "red" },
        { name: "row_cheat_lint", outcome: "green" },
      ]),
    );
    // results exits 1 and writes run-state.json with red colour + lint finding
    assert.equal(runLedger(["results", dir, junitPath, "--tests", testsDir]).status, 1);

    const claimsPath = path.join(dir, "claims.yaml");
    writeYaml(claimsPath, {
      claims: [
        { id: "row_wrong_colour", redCondition: "Remove confirmation banner" },
        { id: "row_cheat_lint", redCondition: "Remove dialog trigger" },
      ],
    });

    const verifyRes = runLedger(["verify", dir, claimsPath]);
    assert.equal(verifyRes.status, 1);
    assert.match(verifyRes.stderr, /\[row_wrong_colour\] \(active\): expected green, got red/);
    assert.match(verifyRes.stderr, /\[row_cheat_lint\]: has 1 cheat-lint finding/);
  });

  it("resolves prefix-overlapping row IDs in separate test files without ambiguity", () => {
    const dir = makeTempDir("prefix-overlap");
    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir, { recursive: true });

    fs.writeFileSync(path.join(testsDir, "users.test.ts"), 'test("create_user", () => {});\n');
    fs.writeFileSync(
      path.join(testsDir, "admin.test.ts"),
      'test("create_user_admin", () => {});\n',
    );

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "users.oracle.yaml"), {
      kind: "cli",
      slice: "users",
      rows: [
        {
          id: "create_user",
          status: "active",
          when: "Create standard user",
          expect: "Exits 0",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "create_user_admin",
          status: "active",
          when: "Create admin user",
          expect: "Exits 0",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const junitPath = path.join(dir, "res.xml");
    fs.writeFileSync(
      junitPath,
      makeJUnitXml([
        { name: "create_user", outcome: "green" },
        { name: "create_user_admin", outcome: "green" },
      ]),
    );

    const res = runLedger(["results", dir, junitPath, "--tests", testsDir]);
    assert.equal(res.status, 0, res.stderr);

    const runState = JSON.parse(fs.readFileSync(path.join(dir, "run-state.json"), "utf8"));
    assert.equal(runState.rows.create_user.testFile, "tests/users.test.ts");
    assert.equal(runState.rows.create_user_admin.testFile, "tests/admin.test.ts");
  });

  it("refuses duplicate JUnit testcase matches for the same row ID with exit 2", () => {
    const dir = makeTempDir("dup-junit");
    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir, { recursive: true });

    fs.writeFileSync(path.join(testsDir, "a.test.ts"), 'test("dup_row", () => {});\n');

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "cli",
      slice: "s",
      rows: [
        {
          id: "dup_row",
          status: "active",
          when: "Run once",
          expect: "Passes",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const junitPath = path.join(dir, "dup.xml");
    fs.writeFileSync(
      junitPath,
      makeJUnitXml([
        { name: "dup_row", outcome: "red" },
        { name: "dup_row", outcome: "green" },
      ]),
    );

    const res = runLedger(["results", dir, junitPath, "--tests", testsDir]);
    assert.equal(res.status, 2);
    assert.match(res.stderr, /duplicate JUnit testcase.*dup_row/);
  });

  it("verify clears prior claim state when a previously claimed row later fails verification", () => {
    const dir = makeTempDir("verify-clear-claim");
    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir, { recursive: true });

    fs.writeFileSync(
      path.join(testsDir, "a.test.ts"),
      'test("row_a", () => {});\ntest("row_b", () => {});\n',
    );

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "cli",
      slice: "s",
      rows: [
        {
          id: "row_a",
          status: "active",
          when: "Run a",
          expect: "Passes",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "row_b",
          status: "active",
          when: "Run b",
          expect: "Passes",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const junitPath = path.join(dir, "res.xml");
    fs.writeFileSync(
      junitPath,
      makeJUnitXml([
        { name: "row_a", outcome: "green" },
        { name: "row_b", outcome: "green" },
      ]),
    );
    assert.equal(runLedger(["results", dir, junitPath, "--tests", testsDir]).status, 0);

    const claimsPath = path.join(dir, "claims.yaml");
    writeYaml(claimsPath, {
      claims: [
        { id: "row_a", redCondition: "Break a" },
        { id: "row_b", redCondition: "Break b" },
      ],
    });
    assert.equal(runLedger(["verify", dir, claimsPath]).status, 0);
    assert.equal(runLedger(["open", dir]).status, 0);

    // Remove row_b from claims.yaml -> verify exits 1, clears row_b claim, and open exits 1
    writeYaml(claimsPath, {
      claims: [{ id: "row_a", redCondition: "Break a" }],
    });
    assert.equal(runLedger(["verify", dir, claimsPath]).status, 1);

    const runState = JSON.parse(fs.readFileSync(path.join(dir, "run-state.json"), "utf8"));
    assert.equal(runState.rows.row_b.claimed, false);
    assert.equal(runState.rows.row_b.redCondition, undefined);
    assert.equal(runState.rows.row_b.verifiedFileHash, undefined);

    const openRes = runLedger(["open", dir]);
    assert.equal(openRes.status, 1);
    assert.match(openRes.stdout, /row_b.*unclaimed/);
  });
});

describe("schema", () => {
  it("emits valid JSON Schema to stdout and to --out", () => {
    const stdoutRes = runLedger(["schema"]);
    assert.equal(stdoutRes.status, 0);
    const parsed = JSON.parse(stdoutRes.stdout);
    assert.equal(typeof parsed, "object");
    assert.ok(Array.isArray(parsed.oneOf));

    const dir = makeTempDir("schema-out");
    const outPath = path.join(dir, "oracle.schema.json");
    const fileRes = runLedger(["schema", "--out", outPath]);
    assert.equal(fileRes.status, 0);
    const fromFile = JSON.parse(fs.readFileSync(outPath, "utf8"));
    assert.deepEqual(fromFile, parsed);
  });
});

describe("io helpers", () => {
  it("readJsonFile reports missing files and invalid JSON as structured errors", () => {
    const dir = makeTempDir("io-json");
    const missing = readJsonFile(
      path.join(dir, "missing.json"),
      OracleConfSchema,
      "oracle.conf.json",
    );
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.match(missing.error, /oracle\.conf\.json not found:/);
    }

    const badPath = path.join(dir, "bad.json");
    fs.writeFileSync(badPath, "{not valid json", "utf8");
    const invalid = readJsonFile(badPath, OracleConfSchema, "oracle.conf.json");
    assert.equal(invalid.ok, false);
    if (!invalid.ok) {
      assert.match(invalid.error, /oracle\.conf\.json is not valid JSON:/);
    }
  });

  it("readTypedYamlFile reports missing files and schema validation failures", () => {
    const dir = makeTempDir("io-yaml");
    const missing = readTypedYamlFile(
      path.join(dir, "missing.yaml"),
      ClaimsFileSchema,
      "claims.yaml",
    );
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.match(missing.error, /claims\.yaml not found:/);
    }

    const invalidPath = path.join(dir, "invalid.yaml");
    fs.writeFileSync(invalidPath, "claims: not-an-array\n", "utf8");
    const invalid = readTypedYamlFile(invalidPath, ClaimsFileSchema, "claims.yaml");
    assert.equal(invalid.ok, false);
    if (!invalid.ok) {
      assert.match(invalid.error, /claims\.yaml failed schema validation:/);
    }
  });

  it("writeJsonAtomic cleans up the sibling .tmp file when rename fails", () => {
    const parent = makeTempDir("io-atomic-cleanup");
    const targetDir = path.join(parent, "existing-dir");
    fs.mkdirSync(targetDir);

    assert.throws(() => writeJsonAtomic(targetDir, { ok: true }));
    assert.deepEqual(fs.readdirSync(parent), ["existing-dir"]);
  });

  it("loadOracleFiles returns an error when caseDir is missing or not a directory", () => {
    const dir = makeTempDir("io-load-dir");
    const missing = loadOracleFiles(path.join(dir, "nope"));
    assert.equal(missing.ok, false);
    if (!missing.ok) {
      assert.match(missing.errors[0] ?? "", /Case directory not found:/);
    }

    const filePath = path.join(dir, "plain.txt");
    fs.writeFileSync(filePath, "hi", "utf8");
    const notDir = loadOracleFiles(filePath);
    assert.equal(notDir.ok, false);
    if (!notDir.ok) {
      assert.match(notDir.errors[0] ?? "", /Case directory not found:/);
    }
  });

  it("collectCandidateFiles recurses into subdirectories and skips nonexistent paths and IGNORED_DIRS while accepting direct files", () => {
    const dir = makeTempDir("io-collect");
    const directFile = path.join(dir, "direct.test.ts");
    const subDir = path.join(dir, "suite");
    const subFile = path.join(subDir, "kept.test.ts");
    const deepFile = path.join(subDir, "nested", "deep.test.ts");
    const ignoredNodeModules = path.join(subDir, "node_modules", "skip.test.ts");
    const ignoredDist = path.join(subDir, "dist", "skip2.test.ts");

    fs.writeFileSync(directFile, "", "utf8");
    fs.mkdirSync(path.dirname(deepFile), { recursive: true });
    fs.mkdirSync(path.dirname(ignoredNodeModules), { recursive: true });
    fs.mkdirSync(path.dirname(ignoredDist), { recursive: true });
    fs.writeFileSync(subFile, "", "utf8");
    fs.writeFileSync(deepFile, "", "utf8");
    fs.writeFileSync(ignoredNodeModules, "", "utf8");
    fs.writeFileSync(ignoredDist, "", "utf8");

    const found = collectCandidateFiles([path.join(dir, "does-not-exist"), directFile, subDir]);
    assert.deepEqual(found, [directFile, subFile, deepFile].sort());
  });

  it("resolveTestFile falls back to candidate token-scanning when tc.file does not exist", () => {
    const dir = makeTempDir("io-resolve-missing-attr");
    const testFile = path.join(dir, "alpha.test.ts");
    fs.writeFileSync(testFile, 'test("row_alpha", () => {});\n', "utf8");

    const res = resolveTestFile(
      dir,
      { name: "row_alpha", colour: "green", file: "nonexistent/stale.test.ts" },
      "row_alpha",
      [testFile],
      new Map(),
    );
    assert.deepEqual(res, { ok: true, absPath: testFile });
  });

  it("resolveTestFile falls back to matching rowId when rowId differs from tc.name", () => {
    const dir = makeTempDir("io-resolve-fallback");
    const testFile = path.join(dir, "alpha.test.ts");
    fs.writeFileSync(testFile, "// covers row_alpha\n", "utf8");

    const res = resolveTestFile(
      dir,
      { name: "Row-Alpha", colour: "green" },
      "row_alpha",
      [testFile],
      new Map(),
    );
    assert.deepEqual(res, { ok: true, absPath: testFile });
  });

  it("readJUnitFiles returns a structured error when an XML file is missing", () => {
    const dir = makeTempDir("io-junit-missing");
    const res = readJUnitFiles([path.join(dir, "missing.xml")]);
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.match(res.error, /JUnit XML file not found:/);
    }
  });
});

describe("command error branches", () => {
  it("freeze and rows exit 2 when oracle.conf.json is missing", () => {
    const emptyDir = makeTempDir("cmd-missing-conf");

    const freezeRes = runLedger(["freeze", emptyDir, "--words", "scope"]);
    assert.equal(freezeRes.status, 2);
    assert.match(freezeRes.stderr, /freeze: oracle\.conf\.json not found:/);

    const rowsRes = runLedger(["rows", emptyDir, "--draft"]);
    assert.equal(rowsRes.status, 2);
    assert.match(rowsRes.stderr, /rows: oracle\.conf\.json not found:/);
  });

  it("rows exits 1 when the frozen script is deleted from disk", () => {
    const dir = makeTempDir("rows-missing-frozen-script");
    const scriptPath = path.join(dir, "rows.mjs");
    fs.writeFileSync(scriptPath, 'console.log(JSON.stringify({ id: "r1" }));\n');
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    assert.equal(runLedger(["freeze", dir, "--words", "scope"]).status, 0);

    fs.rmSync(scriptPath);
    const res = runLedger(["rows", dir]);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /rows: frozen script missing:/);
  });

  it("rows exits 2 on spawn error, non-zero script exit, invalid JSON, schema error, and corrupt existing YAML", () => {
    const spawnDir = makeTempDir("rows-spawn-err");
    writeJson(path.join(spawnDir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["nonexistent-oracle-binary-xyz", "rows.mjs"],
    });
    const spawnRes = runLedger(["rows", spawnDir, "--draft"]);
    assert.equal(spawnRes.status, 2);
    assert.match(spawnRes.stderr, /rows: failed to run row script:/);

    const exitDir = makeTempDir("rows-nonzero");
    fs.writeFileSync(path.join(exitDir, "rows.mjs"), "process.exit(3);\n");
    writeJson(path.join(exitDir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    const exitRes = runLedger(["rows", exitDir, "--draft"]);
    assert.equal(exitRes.status, 2);
    assert.match(exitRes.stderr, /rows: row script exited with code 3/);

    const badJsonDir = makeTempDir("rows-bad-json");
    fs.writeFileSync(path.join(badJsonDir, "rows.mjs"), 'console.log("{not json");\n');
    writeJson(path.join(badJsonDir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    const badJsonRes = runLedger(["rows", badJsonDir, "--draft"]);
    assert.equal(badJsonRes.status, 2);
    assert.match(badJsonRes.stderr, /rows: stdout line 1 is not valid JSON:/);

    const badSchemaDir = makeTempDir("rows-bad-schema");
    fs.writeFileSync(path.join(badSchemaDir, "rows.mjs"), 'console.log("{}");\n');
    writeJson(path.join(badSchemaDir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    const badSchemaRes = runLedger(["rows", badSchemaDir, "--draft"]);
    assert.equal(badSchemaRes.status, 2);
    assert.match(badSchemaRes.stderr, /rows: stdout line 1 failed schema validation:/);

    const badExistingDir = makeTempDir("rows-bad-existing");
    fs.writeFileSync(
      path.join(badExistingDir, "rows.mjs"),
      'console.log(JSON.stringify({ id: "r1", slice: "s" }));\n',
    );
    writeJson(path.join(badExistingDir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    fs.writeFileSync(
      path.join(badExistingDir, "s.oracle.yaml"),
      "kind: invalid-kind\nslice: s\nrows: []\n",
      "utf8",
    );
    const badExistingRes = runLedger(["rows", badExistingDir, "--draft"]);
    assert.equal(badExistingRes.status, 2);
    assert.match(badExistingRes.stderr, /rows: s\.oracle\.yaml failed schema validation:/);
  });

  it("results covers missing conf, invalid YAML, unknown --slice, missing JUnit XML, and missing-from-JUnit row", () => {
    const emptyDir = makeTempDir("results-no-conf");
    const testsDir = path.join(emptyDir, "tests");
    fs.mkdirSync(testsDir);
    const noConfRes = runLedger([
      "results",
      emptyDir,
      path.join(emptyDir, "res.xml"),
      "--tests",
      testsDir,
    ]);
    assert.equal(noConfRes.status, 2);
    assert.match(noConfRes.stderr, /results: oracle\.conf\.json not found:/);

    const badFilesDir = makeTempDir("results-bad-yaml");
    writeJson(path.join(badFilesDir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    fs.writeFileSync(
      path.join(badFilesDir, "s.oracle.yaml"),
      "kind: invalid-kind\nslice: s\nrows: []\n",
      "utf8",
    );
    const badFilesRes = runLedger([
      "results",
      badFilesDir,
      path.join(badFilesDir, "res.xml"),
      "--tests",
      testsDir,
    ]);
    assert.equal(badFilesRes.status, 1);
    assert.match(badFilesRes.stderr, /results: s\.oracle\.yaml failed schema validation:/);

    const dir = makeTempDir("results-errors");
    const dirTests = path.join(dir, "tests");
    fs.mkdirSync(dirTests);
    fs.writeFileSync(path.join(dirTests, "a.test.ts"), 'test("row_a", () => {});\n');
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "cli",
      slice: "s",
      rows: [
        {
          id: "row_a",
          status: "active",
          when: "Run a",
          expect: "Passes",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const emptyJunit = path.join(dir, "empty.xml");
    fs.writeFileSync(emptyJunit, makeJUnitXml([]));

    const badSliceRes = runLedger([
      "results",
      dir,
      emptyJunit,
      "--tests",
      dirTests,
      "--slice",
      "nope",
    ]);
    assert.equal(badSliceRes.status, 2);
    assert.match(badSliceRes.stderr, /results: slice "nope" not found/);

    const missingXmlRes = runLedger([
      "results",
      dir,
      path.join(dir, "missing.xml"),
      "--tests",
      dirTests,
    ]);
    assert.equal(missingXmlRes.status, 2);
    assert.match(missingXmlRes.stderr, /results: JUnit XML file not found:/);

    const missingRowRes = runLedger(["results", dir, emptyJunit, "--tests", dirTests]);
    assert.equal(missingRowRes.status, 1);
    assert.match(missingRowRes.stderr, /\[row_a\] \(active\): missing from JUnit results/);
  });

  it("verify covers missing conf, invalid YAML, missing lock, missing run-state, missing runRow, and deleted test file", () => {
    const emptyDir = makeTempDir("verify-no-conf");
    const claimsPath = path.join(emptyDir, "claims.yaml");
    writeYaml(claimsPath, { claims: [] });

    const noConfRes = runLedger(["verify", emptyDir, claimsPath]);
    assert.equal(noConfRes.status, 1);
    assert.match(noConfRes.stderr, /verify: oracle\.conf\.json not found:/);

    const dir = makeTempDir("verify-errors");
    const dirClaims = path.join(dir, "claims.yaml");
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    fs.writeFileSync(
      path.join(dir, "s.oracle.yaml"),
      "kind: invalid-kind\nslice: s\nrows: []\n",
      "utf8",
    );
    writeYaml(dirClaims, { claims: [{ id: "row_a", redCondition: "Break a" }] });

    const badFilesRes = runLedger(["verify", dir, dirClaims]);
    assert.equal(badFilesRes.status, 1);
    assert.match(badFilesRes.stderr, /verify: s\.oracle\.yaml failed schema validation:/);

    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "cli",
      slice: "s",
      rows: [
        {
          id: "row_a",
          status: "active",
          when: "Run a",
          expect: "Passes",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "row_b",
          status: "active",
          when: "Run b",
          expect: "Passes",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
    });
    const noLockRes = runLedger(["verify", dir, dirClaims]);
    assert.equal(noLockRes.status, 1);
    assert.match(noLockRes.stderr, /verify: locked\.json not found:/);

    assert.equal(runLedger(["lock", dir]).status, 0);
    const noRunStateRes = runLedger(["verify", dir, dirClaims]);
    assert.equal(noRunStateRes.status, 1);
    assert.match(noRunStateRes.stderr, /verify: run-state\.json not found:/);

    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir);
    const testFile = path.join(testsDir, "a.test.ts");
    fs.writeFileSync(testFile, 'test("row_a", () => {});\n');
    const junitPath = path.join(dir, "res.xml");
    fs.writeFileSync(junitPath, makeJUnitXml([{ name: "row_a", outcome: "green" }]));
    // results exits 1 because row_b is missing from JUnit, but still writes run-state.json with row_a
    assert.equal(runLedger(["results", dir, junitPath, "--tests", testsDir]).status, 1);

    writeYaml(dirClaims, {
      claims: [
        { id: "row_a", redCondition: "Break a" },
        { id: "row_b", redCondition: "Break b" },
      ],
    });
    const missingRunRowRes = runLedger(["verify", dir, dirClaims]);
    assert.equal(missingRunRowRes.status, 1);
    assert.match(missingRunRowRes.stderr, /\[row_b\]: not present in run-state\.json/);

    fs.rmSync(testFile);
    const missingTestFileRes = runLedger(["verify", dir, dirClaims]);
    assert.equal(missingTestFileRes.status, 1);
    assert.match(missingTestFileRes.stderr, /\[row_a\]: test file missing on disk:/);
  });

  it("open covers missing conf, invalid YAML, and prints Lock issues, Unresolved gone, and Live unplaced", () => {
    const emptyDir = makeTempDir("open-no-conf");
    const noConfRes = runLedger(["open", emptyDir]);
    assert.equal(noConfRes.status, 1);
    assert.match(noConfRes.stderr, /open: oracle\.conf\.json not found:/);

    const dir = makeTempDir("open-sections");
    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    fs.writeFileSync(
      path.join(dir, "s.oracle.yaml"),
      "kind: invalid-kind\nslice: s\nrows: []\n",
      "utf8",
    );
    const badFilesRes = runLedger(["open", dir]);
    assert.equal(badFilesRes.status, 1);
    assert.match(badFilesRes.stderr, /open: s\.oracle\.yaml failed schema validation:/);

    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "cli",
      slice: "s",
      rows: [
        {
          id: "gone_row",
          gone: true,
          status: "active",
          when: "Old command",
          expect: "Prints old output",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
      ],
      unplaced: [{ id: "mystery_branch", reason: "dynamic dispatch" }],
    });
    const openRes = runLedger(["open", dir]);
    assert.equal(openRes.status, 1);
    assert.match(openRes.stdout, /Lock issues:/);
    assert.match(openRes.stdout, /Unresolved gone \(1\): s:gone_row/);
    assert.match(openRes.stdout, /Live unplaced \(1\):/);
    assert.match(openRes.stdout, /s:mystery_branch \(dynamic dispatch\)/);
  });

  it("results and verify skip non-runnable rows, results ignores unmatched JUnit testcases, and open flags deleted test files", () => {
    const dir = makeTempDir("cmd-nonrunnable-and-deleted");
    const testsDir = path.join(dir, "tests");
    fs.mkdirSync(testsDir);
    const testFile = path.join(testsDir, "a.test.ts");
    fs.writeFileSync(testFile, 'test("row_a", () => {});\n', "utf8");

    writeJson(path.join(dir, "oracle.conf.json"), {
      kind: "cli",
      rows: ["node", "rows.mjs"],
    });
    writeYaml(path.join(dir, "s.oracle.yaml"), {
      kind: "cli",
      slice: "s",
      rows: [
        {
          id: "row_a",
          status: "active",
          when: "Run a",
          expect: "Passes",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: null,
          question: null,
        },
        {
          id: "row_cant",
          status: "cant-happen",
          when: "Impossible input",
          expect: "Unreachable",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: "Guarded by schema",
          question: null,
        },
        {
          id: "row_other",
          status: "other-level",
          when: "Handled upstream",
          expect: "Checked in unit suite",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: "Covered by unit test",
          question: null,
        },
        {
          id: "row_struck",
          status: "struck",
          when: "Obsolete path",
          expect: "Removed",
          source: "written",
          sourceRef: "oracle.conf.json",
          shortfall: null,
          reason: "No longer supported",
          question: null,
        },
      ],
    });
    assert.equal(runLedger(["lock", dir]).status, 0);

    const junitPath = path.join(dir, "res.xml");
    fs.writeFileSync(
      junitPath,
      makeJUnitXml([
        { name: "unrelated_helper_test", outcome: "green" },
        { name: "row_a", outcome: "green" },
      ]),
      "utf8",
    );

    const resultsRes = runLedger(["results", dir, junitPath, "--tests", testsDir]);
    assert.equal(resultsRes.status, 0, resultsRes.stderr);
    assert.match(resultsRes.stdout, /Results recorded: 1 matched row\(s\) passed/);

    const runStateRes = readJsonFile(
      path.join(dir, "run-state.json"),
      RunStateSchema,
      "run-state.json",
    );
    assert.equal(runStateRes.ok, true);
    if (runStateRes.ok) {
      assert.deepEqual(Object.keys(runStateRes.data.rows), ["row_a"]);
    }

    const claimsPath = path.join(dir, "claims.yaml");
    writeYaml(claimsPath, {
      claims: [{ id: "row_a", redCondition: "Return non-zero on a" }],
    });
    const verifyRes = runLedger(["verify", dir, claimsPath]);
    assert.equal(verifyRes.status, 0, verifyRes.stderr);

    const closedOpenRes = runLedger(["open", dir]);
    assert.equal(closedOpenRes.status, 0, closedOpenRes.stdout + closedOpenRes.stderr);

    fs.rmSync(testFile);
    const deletedOpenRes = runLedger(["open", dir]);
    assert.equal(deletedOpenRes.status, 1);
    assert.match(deletedOpenRes.stdout, /s:row_a \(active\): test file missing on disk/);
  });
});
