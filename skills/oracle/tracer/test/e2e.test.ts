import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "../cli.ts";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const TRACER_DIR = path.resolve(TEST_DIR, "..");
const LEDGER_MJS = path.resolve(TRACER_DIR, "..", "scripts", "ledger.mjs");

const runLedger = (args: string[]): { status: number; stdout: string; stderr: string } => {
  const proc = spawnSync(process.execPath, [LEDGER_MJS, ...args], {
    encoding: "utf8",
  });
  return {
    status: proc.status ?? 1,
    stdout: proc.stdout,
    stderr: proc.stderr,
  };
};

const runCliTestJunit = (
  testFile: string,
  xmlOut: string,
): { status: number; stderr: string } => {
  const { NODE_TEST_CONTEXT: _ignored, ...cleanEnv } = process.env;
  const proc = spawnSync(
    process.execPath,
    ["--test", "--test-reporter=junit", testFile],
    { encoding: "utf8", env: cleanEnv },
  );
  fs.writeFileSync(xmlOut, proc.stdout, "utf8");
  return {
    status: proc.status ?? 1,
    stderr: proc.stderr,
  };
};

const FILLED_ORACLE_YAML = `kind: cli
slice: cli
rows:
  - id: greet_name
    where: ../cli.ts
    status: active
    when: greet is called with a name argument
    expect: exit 0 with stdout "Hello, <name>!"
    source: written
    shortfall: null
    reason: null
    question: null
  - id: greet_missing
    where: ../cli.ts
    status: active
    when: greet is called with no name argument
    expect: 'exit 2 with stdout "usage: greet <name>"'
    source: written
    shortfall: null
    reason: null
    question: null
  - id: list_json
    where: ../cli.ts
    status: active
    when: list is called with --format json
    expect: exit 0 with sorted JSON array of items
    source: written
    shortfall: null
    reason: null
    question: null
  - id: list_text
    where: ../cli.ts
    status: shortfall
    when: list is called with --format text
    expect: exit 0 with newline-separated items sorted alphabetically
    source: written
    shortfall: list --format text currently returns items unsorted (mango, apple, cherry)
    reason: null
    question: null
`;

const CLAIMS_YAML = `claims:
  - id: greet_name
    redCondition: Changing greet to omit the name or return a non-zero exit code fails greet_name
  - id: greet_missing
    redCondition: Changing missing-arg greet to exit 0 or alter the usage string fails greet_missing
  - id: list_json
    redCondition: Returning invalid JSON, wrong items, or unsorted order fails list_json
  - id: list_text
    redCondition: Today's unsorted output fails list_text; fixing sort order turns it green and fails shortfall expectation
`;

const setupVerifiedTempCase = (): {
  tempRoot: string;
  caseDir: string;
  testFile: string;
  oracleYaml: string;
  xmlOut: string;
  claimsPath: string;
} => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oracle-tracer-e2e-"));
  const caseDir = path.join(tempRoot, "__oracle__");
  const testDir = path.join(tempRoot, "test");
  fs.mkdirSync(caseDir, { recursive: true });
  fs.mkdirSync(testDir, { recursive: true });

  fs.copyFileSync(path.join(TRACER_DIR, "cli.ts"), path.join(tempRoot, "cli.ts"));
  fs.copyFileSync(
    path.join(TRACER_DIR, "__oracle__", "oracle.conf.json"),
    path.join(caseDir, "oracle.conf.json"),
  );
  fs.copyFileSync(
    path.join(TRACER_DIR, "__oracle__", "rows.ts"),
    path.join(caseDir, "rows.ts"),
  );
  const testFile = path.join(testDir, "cli.test.ts");
  fs.copyFileSync(path.join(TRACER_DIR, "test", "cli.test.ts"), testFile);

  const freeze = runLedger(["freeze", caseDir, "--words", "tracer cli behaviour"]);
  assert.equal(freeze.status, 0, freeze.stderr);

  const rows = runLedger(["rows", caseDir]);
  assert.equal(rows.status, 0, rows.stderr);

  const oracleYaml = path.join(caseDir, "cli.oracle.yaml");
  assert.ok(fs.existsSync(oracleYaml), "rows should generate cli.oracle.yaml");
  fs.writeFileSync(oracleYaml, FILLED_ORACLE_YAML, "utf8");

  const validate = runLedger(["validate", caseDir]);
  assert.equal(validate.status, 0, validate.stderr);

  const lock = runLedger(["lock", caseDir]);
  assert.equal(lock.status, 0, lock.stderr);

  const xmlOut = path.join(caseDir, "results.xml");
  const junit = runCliTestJunit(testFile, xmlOut);
  assert.equal(junit.status, 1, "cli.test.ts should exit 1 due to plainly red shortfall test");

  const results = runLedger([
    "results",
    caseDir,
    xmlOut,
    "--tests",
    testFile,
    "--slice",
    "cli",
  ]);
  assert.equal(results.status, 0, results.stderr);

  const claimsPath = path.join(caseDir, "claims.yaml");
  fs.writeFileSync(claimsPath, CLAIMS_YAML, "utf8");

  const verify = runLedger(["verify", caseDir, claimsPath]);
  assert.equal(verify.status, 0, verify.stderr);

  const open = runLedger(["open", caseDir]);
  assert.equal(open.status, 0, `${open.stdout}\n${open.stderr}`);

  return { tempRoot, caseDir, testFile, oracleYaml, xmlOut, claimsPath };
};

test("cli error paths return exit 2", () => {
  const unknown = run(["bogus"]);
  assert.equal(unknown.exit, 2);
  assert.match(unknown.out, /unknown command: bogus/);

  const empty = run([]);
  assert.equal(empty.exit, 2);
  assert.match(empty.out, /unknown command/);

  const missingFormat = run(["list"]);
  assert.equal(missingFormat.exit, 2);
  assert.equal(missingFormat.out, "usage: list --format <json|text>");

  const invalidFormat = run(["list", "--format", "xml"]);
  assert.equal(invalidFormat.exit, 2);
  assert.equal(invalidFormat.out, "invalid --format: xml");
});

test("full oracle lifecycle passes open and rejects shortfall-pass, yaml tamper, and post-verify test edit", (t) => {
  const { tempRoot, caseDir, testFile, oracleYaml, xmlOut } = setupVerifiedTempCase();
  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const originalTest = fs.readFileSync(testFile, "utf8");
  const originalYaml = fs.readFileSync(oracleYaml, "utf8");

  // (a) Shortfall test changed to pass -> results fails and open exits 1.
  const cheatedTest = originalTest.replace(
    'assert.equal(res.out, "apple\\ncherry\\nmango");',
    'assert.equal(res.out, "mango\\napple\\ncherry");',
  );
  assert.notEqual(cheatedTest, originalTest, "should rewrite shortfall assertion");
  fs.writeFileSync(testFile, cheatedTest, "utf8");

  const cheatedJunit = runCliTestJunit(testFile, xmlOut);
  assert.equal(cheatedJunit.status, 0, "cheated cli.test.ts should pass all 4 tests");

  const cheatedResults = runLedger([
    "results",
    caseDir,
    xmlOut,
    "--tests",
    testFile,
    "--slice",
    "cli",
  ]);
  assert.equal(cheatedResults.status, 1, "results must reject a shortfall row running green");

  const openAfterShortfallPass = runLedger(["open", caseDir]);
  assert.equal(
    openAfterShortfallPass.status,
    1,
    "open must exit 1 when shortfall test passes",
  );
  assert.match(openAfterShortfallPass.stdout, /list_text.*expected red, got green/);

  // Restore clean verified state before testing (b) and (c).
  fs.writeFileSync(testFile, originalTest, "utf8");
  const restoredJunit = runCliTestJunit(testFile, xmlOut);
  assert.equal(restoredJunit.status, 1);
  assert.equal(
    runLedger(["results", caseDir, xmlOut, "--tests", testFile, "--slice", "cli"]).status,
    0,
  );
  assert.equal(runLedger(["verify", caseDir, path.join(caseDir, "claims.yaml")]).status, 0);
  assert.equal(runLedger(["open", caseDir]).status, 0);

  // (b) Locked row's expect edited -> open exits 1.
  const tamperedYaml = originalYaml.replace(
    'expect: exit 0 with stdout "Hello, <name>!"',
    'expect: exit 0 with any greeting',
  );
  assert.notEqual(tamperedYaml, originalYaml, "should rewrite locked expect");
  fs.writeFileSync(oracleYaml, tamperedYaml, "utf8");

  const openAfterYamlEdit = runLedger(["open", caseDir]);
  assert.equal(
    openAfterYamlEdit.status,
    1,
    "open must exit 1 when a locked row's expect is edited",
  );
  assert.match(openAfterYamlEdit.stdout, /greet_name.*drifted from locked\.json/);

  // Restore YAML and confirm open is 0 again before (c).
  fs.writeFileSync(oracleYaml, originalYaml, "utf8");
  assert.equal(runLedger(["open", caseDir]).status, 0);

  // (c) cli.test.ts edited after verify -> open exits 1.
  fs.writeFileSync(testFile, `${originalTest}\n// post-verify edit\n`, "utf8");

  const openAfterTestEdit = runLedger(["open", caseDir]);
  assert.equal(
    openAfterTestEdit.status,
    1,
    "open must exit 1 when cli.test.ts is edited after verify",
  );
  assert.match(openAfterTestEdit.stdout, /test file changed after verify/);
});
