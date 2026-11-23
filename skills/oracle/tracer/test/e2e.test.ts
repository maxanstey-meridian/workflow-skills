import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

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

const runTicketTestJunit = (
  testFile: string,
  xmlOut: string,
): { status: number; stderr: string } => {
  const { NODE_TEST_CONTEXT: _ignored, ...cleanEnv } = process.env;
  const proc = spawnSync(process.execPath, ["--test", "--test-reporter=junit", testFile], {
    encoding: "utf8",
    env: cleanEnv,
  });
  fs.writeFileSync(xmlOut, proc.stdout, "utf8");
  return {
    status: proc.status ?? 1,
    stderr: proc.stderr,
  };
};

const FILLED_ORACLE_YAML = `kind: cli
slice: lifecycle
rows:
  - id: open_pause
    where: ../ticket.ts
    status: active
    when: decide is called with status open and action pause
    expect: returns ok true with next paused
    source: written
    shortfall: null
    reason: null
    question: null
  - id: open_resume
    where: ../ticket.ts
    status: active
    when: decide is called with status open and action resume
    expect: returns ok false with a non-empty refusal reason
    source: written
    shortfall: null
    reason: null
    question: null
  - id: open_close
    where: ../ticket.ts
    status: active
    when: decide is called with status open and action close
    expect: returns ok true with next closed
    source: written
    shortfall: null
    reason: null
    question: null
  - id: paused_pause
    where: ../ticket.ts
    status: active
    when: decide is called with status paused and action pause
    expect: returns ok false with a non-empty refusal reason
    source: written
    shortfall: null
    reason: null
    question: null
  - id: paused_resume
    where: ../ticket.ts
    status: active
    when: decide is called with status paused and action resume
    expect: returns ok true with next open
    source: written
    shortfall: null
    reason: null
    question: null
  - id: paused_close
    where: ../ticket.ts
    status: shortfall
    when: decide is called with status paused and action close
    expect: returns ok true with next closed
    source: written
    shortfall: decide currently refuses closing a paused ticket instead of transitioning to closed
    reason: null
    question: null
  - id: closed_pause
    where: ../ticket.ts
    status: active
    when: decide is called with status closed and action pause
    expect: returns ok false with a non-empty refusal reason
    source: written
    shortfall: null
    reason: null
    question: null
  - id: closed_resume
    where: ../ticket.ts
    status: active
    when: decide is called with status closed and action resume
    expect: returns ok false with a non-empty refusal reason
    source: written
    shortfall: null
    reason: null
    question: null
  - id: closed_close
    where: ../ticket.ts
    status: active
    when: decide is called with status closed and action close
    expect: returns ok false with a non-empty refusal reason
    source: written
    shortfall: null
    reason: null
    question: null
`;

const CLAIMS_YAML = `claims:
  - id: open_pause
    redCondition: Refusing open + pause or returning a next status other than paused fails open_pause
  - id: open_resume
    redCondition: Accepting open + resume or omitting the refusal reason fails open_resume
  - id: open_close
    redCondition: Refusing open + close or returning a next status other than closed fails open_close
  - id: paused_pause
    redCondition: Accepting paused + pause or omitting the refusal reason fails paused_pause
  - id: paused_resume
    redCondition: Refusing paused + resume or returning a next status other than open fails paused_resume
  - id: paused_close
    redCondition: Today's refusal fails paused_close; fixing decide to close paused tickets turns it green and fails shortfall expectation
  - id: closed_pause
    redCondition: Accepting closed + pause or omitting the refusal reason fails closed_pause
  - id: closed_resume
    redCondition: Accepting closed + resume or omitting the refusal reason fails closed_resume
  - id: closed_close
    redCondition: Accepting closed + close or omitting the refusal reason fails closed_close
`;

const copyTracerToTemp = (): {
  tempRoot: string;
  caseDir: string;
  ticketFile: string;
  testFile: string;
} => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oracle-tracer-e2e-"));
  const caseDir = path.join(tempRoot, "__oracle__");
  const testDir = path.join(tempRoot, "test");
  fs.mkdirSync(caseDir, { recursive: true });
  fs.mkdirSync(testDir, { recursive: true });

  const ticketFile = path.join(tempRoot, "ticket.ts");
  fs.copyFileSync(path.join(TRACER_DIR, "ticket.ts"), ticketFile);
  fs.copyFileSync(
    path.join(TRACER_DIR, "__oracle__", "oracle.conf.json"),
    path.join(caseDir, "oracle.conf.json"),
  );
  fs.copyFileSync(path.join(TRACER_DIR, "__oracle__", "rows.ts"), path.join(caseDir, "rows.ts"));
  const testFile = path.join(testDir, "ticket.test.ts");
  fs.copyFileSync(path.join(TRACER_DIR, "test", "ticket.test.ts"), testFile);

  return { tempRoot, caseDir, ticketFile, testFile };
};

const setupVerifiedTempCase = (): {
  tempRoot: string;
  caseDir: string;
  testFile: string;
  oracleYaml: string;
  xmlOut: string;
  claimsPath: string;
} => {
  const { tempRoot, caseDir, testFile } = copyTracerToTemp();

  const freeze = runLedger(["freeze", caseDir, "--words", "ticket lifecycle decider"]);
  assert.equal(freeze.status, 0, freeze.stderr);

  const rows = runLedger(["rows", caseDir]);
  assert.equal(rows.status, 0, rows.stderr);
  assert.match(rows.stdout, /Synced 9 rows/);

  const oracleYaml = path.join(caseDir, "lifecycle.oracle.yaml");
  assert.ok(fs.existsSync(oracleYaml), "rows should generate lifecycle.oracle.yaml");
  fs.writeFileSync(oracleYaml, FILLED_ORACLE_YAML, "utf8");

  const validate = runLedger(["validate", caseDir]);
  assert.equal(validate.status, 0, validate.stderr);

  const lock = runLedger(["lock", caseDir]);
  assert.equal(lock.status, 0, lock.stderr);

  const xmlOut = path.join(caseDir, "results.xml");
  const junit = runTicketTestJunit(testFile, xmlOut);
  assert.equal(junit.status, 1, "ticket.test.ts should exit 1 due to honestly red shortfall test");

  const results = runLedger([
    "results",
    caseDir,
    xmlOut,
    "--tests",
    testFile,
    "--slice",
    "lifecycle",
  ]);
  assert.equal(results.status, 0, results.stderr);

  const claimsPath = path.join(caseDir, "claims.yaml");
  fs.writeFileSync(claimsPath, CLAIMS_YAML, "utf8");

  const verify = runLedger(["verify", caseDir, claimsPath]);
  assert.equal(verify.status, 0, verify.stderr);

  const open = runLedger(["open", caseDir]);
  assert.equal(open.status, 0, `${open.stdout}\n${open.stderr}`);
  assert.match(open.stdout, /Rows \(9\): active=8 shortfall=1/);

  return { tempRoot, caseDir, testFile, oracleYaml, xmlOut, claimsPath };
};

test("rows.ts derives all 9 pairs from ticket.ts and reflects added statuses dynamically", (t) => {
  const { tempRoot, caseDir, ticketFile } = copyTracerToTemp();
  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const initial = runLedger(["rows", caseDir, "--draft"]);
  assert.equal(initial.status, 0, initial.stderr);
  assert.match(initial.stdout, /Synced 9 rows/);

  const oracleYaml = path.join(caseDir, "lifecycle.oracle.yaml");
  const initialContent = fs.readFileSync(oracleYaml, "utf8");
  for (const id of [
    "open_pause",
    "open_resume",
    "open_close",
    "paused_pause",
    "paused_resume",
    "paused_close",
    "closed_pause",
    "closed_resume",
    "closed_close",
  ]) {
    assert.match(initialContent, new RegExp(`id: ${id}\\b`));
  }

  const originalTicket = fs.readFileSync(ticketFile, "utf8");
  const expandedTicket = originalTicket.replace(
    '["open", "paused", "closed"] as const',
    '["open", "paused", "closed", "escalated"] as const',
  );
  assert.notEqual(expandedTicket, originalTicket, "should add a 4th status to ticket.ts");
  fs.writeFileSync(ticketFile, expandedTicket, "utf8");

  const expanded = runLedger(["rows", caseDir, "--draft"]);
  assert.equal(expanded.status, 0, expanded.stderr);
  assert.match(expanded.stdout, /Synced 12 rows/);

  const expandedContent = fs.readFileSync(oracleYaml, "utf8");
  for (const id of ["escalated_pause", "escalated_resume", "escalated_close"]) {
    assert.match(expandedContent, new RegExp(`id: ${id}\\b`));
  }
});

test("full oracle lifecycle passes open and rejects shortfall-pass, tamper, test edit, cheat-lint, unclaimed row, and folded scalars", (t) => {
  const { tempRoot, caseDir, testFile, oracleYaml, xmlOut, claimsPath } = setupVerifiedTempCase();
  t.after(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  const originalTest = fs.readFileSync(testFile, "utf8");
  const originalYaml = fs.readFileSync(oracleYaml, "utf8");
  const originalClaims = fs.readFileSync(claimsPath, "utf8");

  const restoreVerifiedState = (): void => {
    fs.writeFileSync(testFile, originalTest, "utf8");
    fs.writeFileSync(oracleYaml, originalYaml, "utf8");
    fs.writeFileSync(claimsPath, originalClaims, "utf8");
    const restoredJunit = runTicketTestJunit(testFile, xmlOut);
    assert.equal(restoredJunit.status, 1);
    assert.equal(
      runLedger(["results", caseDir, xmlOut, "--tests", testFile, "--slice", "lifecycle"]).status,
      0,
    );
    assert.equal(runLedger(["verify", caseDir, claimsPath]).status, 0);
    assert.equal(runLedger(["open", caseDir]).status, 0);
  };

  // (a) Shortfall test changed to pass -> results fails and open exits 1.
  const cheatedShortfall = originalTest.replace(
    'test("paused_close", () => {\n  assert.deepEqual(decide("paused", "close"), { ok: true, next: "closed" });\n});',
    'test("paused_close", () => {\n  assertRefused("paused", "close");\n});',
  );
  assert.notEqual(cheatedShortfall, originalTest, "should rewrite shortfall assertion");
  fs.writeFileSync(testFile, cheatedShortfall, "utf8");

  const cheatedJunit = runTicketTestJunit(testFile, xmlOut);
  assert.equal(cheatedJunit.status, 0, "cheated ticket.test.ts should pass all 9 tests");

  const cheatedResults = runLedger([
    "results",
    caseDir,
    xmlOut,
    "--tests",
    testFile,
    "--slice",
    "lifecycle",
  ]);
  assert.equal(cheatedResults.status, 1, "results must reject a shortfall row running green");

  const openAfterShortfallPass = runLedger(["open", caseDir]);
  assert.equal(openAfterShortfallPass.status, 1, "open must exit 1 when shortfall test passes");
  assert.match(openAfterShortfallPass.stdout, /paused_close.*expected red, got green/);

  restoreVerifiedState();

  // (b) Locked row's expect edited -> open exits 1.
  const tamperedYaml = originalYaml.replace(
    "expect: returns ok true with next paused",
    "expect: returns any decision",
  );
  assert.notEqual(tamperedYaml, originalYaml, "should rewrite locked expect");
  fs.writeFileSync(oracleYaml, tamperedYaml, "utf8");

  const openAfterYamlEdit = runLedger(["open", caseDir]);
  assert.equal(
    openAfterYamlEdit.status,
    1,
    "open must exit 1 when a locked row's expect is edited",
  );
  assert.match(openAfterYamlEdit.stdout, /open_pause.*drifted from locked\.json/);

  fs.writeFileSync(oracleYaml, originalYaml, "utf8");
  assert.equal(runLedger(["open", caseDir]).status, 0);

  // (c) ticket.test.ts edited after verify -> open exits 1.
  fs.writeFileSync(testFile, `${originalTest}\n// post-verify edit\n`, "utf8");

  const openAfterTestEdit = runLedger(["open", caseDir]);
  assert.equal(
    openAfterTestEdit.status,
    1,
    "open must exit 1 when ticket.test.ts is edited after verify",
  );
  assert.match(openAfterTestEdit.stdout, /test file changed after verify/);

  fs.writeFileSync(testFile, originalTest, "utf8");
  assert.equal(runLedger(["open", caseDir]).status, 0);

  // (d) Cheat-lint (.skip) -> results exits 1 and open exits 1.
  const skippedTest = originalTest.replace('test("open_pause",', 'test.skip("open_pause",');
  assert.notEqual(skippedTest, originalTest, "should rewrite open_pause to test.skip");
  fs.writeFileSync(testFile, skippedTest, "utf8");

  runTicketTestJunit(testFile, xmlOut);
  const skipResults = runLedger([
    "results",
    caseDir,
    xmlOut,
    "--tests",
    testFile,
    "--slice",
    "lifecycle",
  ]);
  assert.equal(skipResults.status, 1, "results must reject skipped test via cheat-lint");
  assert.match(skipResults.stderr, /cheat-lint/);

  const openAfterSkip = runLedger(["open", caseDir]);
  assert.equal(openAfterSkip.status, 1, "open must exit 1 after cheat-lint failure");

  restoreVerifiedState();

  // (e) Unclaimed row -> verify exits 1 and open exits 1.
  const incompleteClaims = originalClaims.replace(
    "  - id: open_close\n    redCondition: Refusing open + close or returning a next status other than closed fails open_close\n",
    "",
  );
  assert.notEqual(incompleteClaims, originalClaims, "should omit open_close from claims.yaml");
  fs.writeFileSync(claimsPath, incompleteClaims, "utf8");

  const verifyMissingClaim = runLedger(["verify", caseDir, claimsPath]);
  assert.equal(verifyMissingClaim.status, 1, "verify must reject missing claim");
  assert.match(verifyMissingClaim.stderr, /open_close.*missing claim/);

  const openAfterMissingClaim = runLedger(["open", caseDir]);
  assert.equal(openAfterMissingClaim.status, 1, "open must exit 1 with an unclaimed row");
  assert.match(openAfterMissingClaim.stdout, /open_close.*unclaimed/);

  restoreVerifiedState();

  // (f) Folded block scalars (> and >-) rejected in oracle YAML and claims YAML.
  const foldedGtYaml = originalYaml.replace(
    "expect: returns ok true with next paused",
    "expect: >\n      returns ok true with next paused",
  );
  assert.notEqual(foldedGtYaml, originalYaml, "should insert > folded scalar");
  fs.writeFileSync(oracleYaml, foldedGtYaml, "utf8");

  const validateGt = runLedger(["validate", caseDir]);
  assert.notEqual(validateGt.status, 0, "validate must reject > folded scalar");
  assert.match(validateGt.stderr, /folded/i);

  const openGt = runLedger(["open", caseDir]);
  assert.notEqual(openGt.status, 0, "open must reject > folded scalar");

  const foldedGtStripYaml = originalYaml.replace(
    "expect: returns ok true with next paused",
    "expect: >-\n      returns ok true with next paused",
  );
  assert.notEqual(foldedGtStripYaml, originalYaml, "should insert >- folded scalar");
  fs.writeFileSync(oracleYaml, foldedGtStripYaml, "utf8");

  const validateGtStrip = runLedger(["validate", caseDir]);
  assert.notEqual(validateGtStrip.status, 0, "validate must reject >- folded scalar");
  assert.match(validateGtStrip.stderr, /folded/i);

  fs.writeFileSync(oracleYaml, originalYaml, "utf8");

  const foldedClaims = originalClaims.replace(
    "redCondition: Refusing open + pause or returning a next status other than paused fails open_pause",
    "redCondition: >-\n      Refusing open + pause or returning a next status other than paused fails open_pause",
  );
  assert.notEqual(foldedClaims, originalClaims, "should insert >- folded scalar in claims.yaml");
  fs.writeFileSync(claimsPath, foldedClaims, "utf8");

  const verifyFoldedClaims = runLedger(["verify", caseDir, claimsPath]);
  assert.notEqual(verifyFoldedClaims.status, 0, "verify must reject >- folded scalar in claims");
  assert.match(verifyFoldedClaims.stderr, /folded/i);
});
