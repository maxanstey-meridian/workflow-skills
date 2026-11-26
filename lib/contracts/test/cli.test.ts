import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_CTL_MJS = path.resolve(__dirname, "../../../skills/spec/scripts/spec-ctl.mjs");

const tmpDirs: string[] = [];

const makeTempDir = (prefix: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `contracts-cli-${prefix}-`));
  tmpDirs.push(dir);
  return dir;
};

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const runCli = (
  args: string[],
  cwd?: string,
): { status: number | null; stdout: string; stderr: string } => {
  const res = spawnSync(process.execPath, [SPEC_CTL_MJS, ...args], {
    cwd,
    encoding: "utf8",
  });
  return {
    status: res.status,
    stdout: res.stdout,
    stderr: res.stderr,
  };
};

const writeYaml = (filePath: string, data: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, YAML.stringify(data, { lineWidth: 0 }), "utf8");
};

const writeJson = (filePath: string, data: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
};

const makeValidSpec = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  title: "YAML pipeline contracts",
  status: "agreed",
  intent: "Validate and render YAML pipeline artifacts.",
  decisions: [
    {
      id: "D1",
      title: "Strict YAML schemas",
      what: "Use Zod strict objects.",
      why: "Catch typos at the boundary.",
      decidedBy: "agreed",
    },
  ],
  pieces: [
    {
      id: "P1",
      name: "Core CLI",
      owns: ["lib/contracts/src/cli.ts"],
      after: [],
      now: "CLI does not exist.",
      reuse: "commander and yaml.",
      change: "Add validate and render commands.",
      proof: "pnpm --dir lib/contracts test",
    },
  ],
  doneMeans: [
    {
      cmd: "pnpm --dir lib/contracts test",
      proves: "All unit and CLI tests pass.",
    },
  ],
  ...overrides,
});

const makeValidOracleCase = (caseDir: string, kind: "api-contract" | "browser" | "cli"): void => {
  writeJson(path.join(caseDir, "oracle.conf.json"), {
    kind,
    rows: ["node", "rows.mjs"],
  });
  writeJson(path.join(caseDir, "locked.json"), {
    lockedAt: "2026-11-23T00:00:00Z",
    kind,
    rows: {},
  });
  writeYaml(path.join(caseDir, "core.oracle.yaml"), {
    kind,
    slice: "core",
    rows: [],
  });
};

describe("spec-ctl validate spec", () => {
  it("exits 0 with OK on a valid spec without oracleCase", () => {
    const dir = makeTempDir("spec-ok");
    const specPath = path.join(dir, "spec.yaml");
    writeYaml(specPath, makeValidSpec());

    const res = runCli(["validate", "spec", specPath]);
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), "OK");
    assert.equal(res.stderr, "");
  });

  it("exits 0 on a valid spec with an existing relative oracleCase path", () => {
    const dir = makeTempDir("spec-oracle-ok");
    const oracleDir = path.join(dir, "__oracle__", "cli-case");
    makeValidOracleCase(oracleDir, "cli");

    const specPath = path.join(dir, "spec.yaml");
    writeYaml(
      specPath,
      makeValidSpec({
        oracleCase: { path: "__oracle__/cli-case", kind: "cli" },
      }),
    );

    const res = runCli(["validate", "spec", specPath], dir);
    assert.equal(res.status, 0);
    assert.equal(res.stdout.trim(), "OK");
  });

  it("exits 1 when oracleCase directory or required files are missing", () => {
    const dir = makeTempDir("spec-oracle-missing");
    const specPath = path.join(dir, "spec.yaml");

    writeYaml(
      specPath,
      makeValidSpec({
        oracleCase: { path: path.join(dir, "does-not-exist"), kind: "cli" },
      }),
    );
    const missingDir = runCli(["validate", "spec", specPath]);
    assert.equal(missingDir.status, 1);
    assert.match(missingDir.stderr, /oracleCase\.path:.*not found/);

    const emptyCaseDir = path.join(dir, "empty-case");
    fs.mkdirSync(emptyCaseDir, { recursive: true });
    writeYaml(
      specPath,
      makeValidSpec({
        oracleCase: { path: emptyCaseDir, kind: "cli" },
      }),
    );
    const missingFiles = runCli(["validate", "spec", specPath]);
    assert.equal(missingFiles.status, 1);
    assert.match(missingFiles.stderr, /missing oracle\.conf\.json/);
    assert.match(missingFiles.stderr, /missing locked\.json/);
    assert.match(missingFiles.stderr, /no \*\.oracle\.yaml files found/);
  });

  it("exits 1 when oracleCase.kind mismatches oracle.conf.json or conf is invalid JSON", () => {
    const dir = makeTempDir("spec-oracle-kind");
    const oracleDir = path.join(dir, "case");
    makeValidOracleCase(oracleDir, "browser");

    const specPath = path.join(dir, "spec.yaml");
    writeYaml(
      specPath,
      makeValidSpec({
        oracleCase: { path: oracleDir, kind: "cli" },
      }),
    );

    const mismatch = runCli(["validate", "spec", specPath]);
    assert.equal(mismatch.status, 1);
    assert.match(mismatch.stderr, /oracleCase\.kind:.*does not match oracle\.conf\.json kind/);

    fs.writeFileSync(path.join(oracleDir, "oracle.conf.json"), "{not-json", "utf8");
    const badJson = runCli(["validate", "spec", specPath]);
    assert.equal(badJson.status, 1);
    assert.match(badJson.stderr, /failed to parse oracle\.conf\.json/);

    writeJson(path.join(oracleDir, "oracle.conf.json"), { kind: "invalid-kind" });
    const invalidKind = runCli(["validate", "spec", specPath]);
    assert.equal(invalidKind.status, 1);
    assert.match(invalidKind.stderr, /oracleCase\.kind:.*missing or invalid kind/);
  });

  it("exits 1 on overlapping owns or unknown keys", () => {
    const dir = makeTempDir("spec-invalid");
    const specPath = path.join(dir, "spec.yaml");
    writeYaml(
      specPath,
      makeValidSpec({
        pieces: [
          {
            id: "P1",
            name: "First",
            owns: ["src/a.ts"],
            after: [],
            now: "Now.",
            reuse: "None.",
            change: "Change.",
            proof: "test",
          },
          {
            id: "P2",
            name: "Second",
            owns: ["./src/a.ts"],
            after: [],
            now: "Now.",
            reuse: "None.",
            change: "Change.",
            proof: "test",
          },
        ],
      }),
    );

    const overlap = runCli(["validate", "spec", specPath]);
    assert.equal(overlap.status, 1);
    assert.match(overlap.stderr, /pieces\[1\]\.owns\[0\]:.*overlaps/);

    writeYaml(specPath, makeValidSpec({ extraTypoKey: true }));
    const unknownKey = runCli(["validate", "spec", specPath]);
    assert.equal(unknownKey.status, 1);
    assert.match(unknownKey.stderr, /Unrecognized key/i);
  });

  it("exits 2 on bad YAML or missing file", () => {
    const dir = makeTempDir("spec-io");
    const badYamlPath = path.join(dir, "bad.yaml");
    fs.writeFileSync(badYamlPath, "title: [unclosed\n", "utf8");

    const badYaml = runCli(["validate", "spec", badYamlPath]);
    assert.equal(badYaml.status, 2);
    assert.match(badYaml.stderr, /Failed to parse YAML/);

    const foldedYamlPath = path.join(dir, "folded.yaml");
    fs.writeFileSync(
      foldedYamlPath,
      [
        "title: Folded spec",
        "status: agreed",
        "intent: >-",
        "  Folded text can inject spaces inside wrapped tokens.",
        "builtPieces: []",
        "pieces:",
        "  - id: P1",
        "    name: First",
        "    owns:",
        "      - src/a.ts",
        "    after: []",
        "    now: Now.",
        "    reuse: None.",
        "    change: Change.",
        "    proof: test",
        "doneMeans:",
        "  - cmd: pnpm test",
        "    proves: Tests pass.",
        "",
      ].join("\n"),
      "utf8",
    );
    const foldedYaml = runCli(["validate", "spec", foldedYamlPath]);
    assert.equal(foldedYaml.status, 2);
    assert.match(foldedYaml.stderr, /Folded block scalars.*intent/);

    const literalYamlPath = path.join(dir, "literal.yaml");
    fs.writeFileSync(
      literalYamlPath,
      fs.readFileSync(foldedYamlPath, "utf8").replace("intent: >-", "intent: |-"),
      "utf8",
    );
    const literalYaml = runCli(["validate", "spec", literalYamlPath]);
    assert.equal(literalYaml.status, 0);
    assert.equal(literalYaml.stdout.trim(), "OK");

    const missing = runCli(["validate", "spec", path.join(dir, "nope.yaml")]);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /Failed to read/);
  });
});

describe("spec-ctl validate cold-read", () => {
  it("exits 0 with matching --spec, 1 on missing Decision, and 2 when --spec is omitted", () => {
    const dir = makeTempDir("cold-read");
    const specPath = path.join(dir, "spec.yaml");
    const reportPath = path.join(dir, "cold-read.yaml");
    writeYaml(specPath, makeValidSpec());
    writeYaml(reportPath, {
      findings: [],
      laws: [
        {
          decisionId: "D1",
          status: "kept",
          lawPath: "tools/use-zod-at-untrusted-runtime-boundaries.md",
          keptBy: "Zod strict schemas validate all external YAML.",
        },
      ],
      machinery: [],
    });

    const ok = runCli(["validate", "cold-read", reportPath, "--spec", specPath]);
    assert.equal(ok.status, 0);
    assert.equal(ok.stdout.trim(), "OK");

    const noSpec = runCli(["validate", "cold-read", reportPath]);
    assert.equal(noSpec.status, 2);
    assert.match(noSpec.stderr, /--spec <spec\.yaml> is required/);

    writeYaml(reportPath, { findings: [], laws: [], machinery: [] });
    const missingDecision = runCli(["validate", "cold-read", reportPath, "--spec", specPath]);
    assert.equal(missingDecision.status, 1);
    assert.match(missingDecision.stderr, /laws:.*missing law check for spec decision "D1"/);

    writeYaml(reportPath, {
      findings: [],
      laws: [{ decisionId: "D1", status: "none-bears" }],
    });
    const missingMachinery = runCli(["validate", "cold-read", reportPath, "--spec", specPath]);
    assert.equal(missingMachinery.status, 1);
    assert.match(missingMachinery.stderr, /machinery/);

    const missingSpecFile = runCli([
      "validate",
      "cold-read",
      reportPath,
      "--spec",
      path.join(dir, "missing-spec.yaml"),
    ]);
    assert.equal(missingSpecFile.status, 2);
    assert.match(missingSpecFile.stderr, /Failed to read/);

    const badSpecPath = path.join(dir, "bad-spec.yaml");
    writeYaml(badSpecPath, makeValidSpec({ status: "draft" }));
    const invalidSpecFile = runCli(["validate", "cold-read", reportPath, "--spec", badSpecPath]);
    assert.equal(invalidSpecFile.status, 1);
    assert.match(invalidSpecFile.stderr, /openAsks:/);
  });
});

describe("spec-ctl validate role reports", () => {
  it("validates build reports (BUILT, STOPPED, and invalid STOPPED)", () => {
    const dir = makeTempDir("build");
    const reportPath = path.join(dir, "build.yaml");

    writeYaml(reportPath, {
      piece: "P1",
      attempt: 1,
      changed: [{ path: "lib/contracts/src/cli.ts", summary: "Added CLI" }],
      decisionsBuilt: [{ id: "D1", summary: "Strict schemas" }],
      ran: [{ cmd: "pnpm test", exit: 0 }],
      notRun: [],
      notBuilt: [],
      result: "BUILT",
    });
    assert.equal(runCli(["validate", "build", reportPath]).status, 0);

    writeYaml(reportPath, {
      piece: "P1",
      attempt: 1,
      result: "STOPPED",
      stopReason: "Spec left exit code undecided.",
    });
    assert.equal(runCli(["validate", "build", reportPath]).status, 0);

    writeYaml(reportPath, {
      piece: "P1",
      attempt: 1,
      result: "STOPPED",
    });
    const invalid = runCli(["validate", "build", reportPath]);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /stopReason/);
  });

  it("validates go-critic reports and rejects inconsistent PASS", () => {
    const dir = makeTempDir("go-critic");
    const reportPath = path.join(dir, "go-critic.yaml");

    writeYaml(reportPath, {
      piece: "P1",
      attempt: 1,
      ran: [{ cmd: "pnpm test", exit: 0 }],
      verdict: "PASS",
    });
    assert.equal(runCli(["validate", "go-critic", reportPath]).status, 0);

    writeYaml(reportPath, {
      piece: "P1",
      attempt: 1,
      ran: [{ cmd: "pnpm test", exit: 0 }],
      missing: ["Forgot negative test"],
      verdict: "PASS",
    });
    const invalid = runCli(["validate", "go-critic", reportPath]);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /missing:.*verdict cannot be "PASS"/);
  });

  it("validates review and fix reports", () => {
    const dir = makeTempDir("review-fix");
    const reviewPath = path.join(dir, "review-1.yaml");
    const fixPath = path.join(dir, "fix-1.yaml");

    writeYaml(reviewPath, {
      findings: [
        {
          id: "F1",
          file: "lib/contracts/src/cli.ts",
          line: 42,
          problem: "Missing exit code 2 handling.",
          harm: "Usage errors look like validation errors.",
          fix: "Override commander exit code.",
          files: ["lib/contracts/src/cli.ts"],
          do: "fix",
        },
      ],
      filesRead: [{ path: "lib/contracts/src/cli.ts", mode: "full" }],
    });
    assert.equal(runCli(["validate", "review", reviewPath]).status, 0);

    writeYaml(reviewPath, {
      toFix: 1,
      findings: [],
      filesRead: [{ path: "lib/contracts/src/cli.ts", mode: "full" }],
    });
    assert.equal(runCli(["validate", "review", reviewPath]).status, 1);

    writeYaml(fixPath, {
      results: [
        {
          findingId: "F1",
          report: "review-1.yaml",
          status: "FIXED",
          change: "Added exitOverride handling.",
        },
      ],
      changedFiles: ["lib/contracts/src/cli.ts"],
    });
    assert.equal(runCli(["validate", "fix", fixPath]).status, 0);

    writeYaml(fixPath, {
      results: [
        {
          findingId: "F1",
          report: "review-1.yaml",
          status: "NEEDS_CALL",
          read: "lib/contracts/src/cli.ts",
          options: [],
        },
      ],
    });
    assert.equal(runCli(["validate", "fix", fixPath]).status, 1);
  });

  it("validates doctrine-review reports and rejects missing machinery or bad broken findingId", () => {
    const dir = makeTempDir("doctrine-review");
    const reportPath = path.join(dir, "review-1-backend-1.yaml");

    writeYaml(reportPath, {
      findings: [
        {
          id: "F1",
          file: "src/parser.ts",
          line: 12,
          rule: "coding/use-a-maintained-library-before-building-machinery.md",
          problem: "Hand-rolled OpenAPI parser.",
          harm: "Duplicates maintained parser logic.",
          fix: "Use the maintained OpenAPI package.",
          files: ["src/parser.ts"],
          do: "fix",
        },
      ],
      filesRead: [{ path: "src/parser.ts", mode: "full" }],
      machinery: [
        { file: "src/parser.ts", symbol: "parseSpec", status: "broken", findingId: "F1" },
        {
          file: "src/frame.ts",
          symbol: "BinaryFrameCodec",
          status: "justified",
          candidatesChecked: ["msgpack (3.x)"],
          constraint: "Fixed 12-byte hardware framing header.",
        },
      ],
    });
    const ok = runCli(["validate", "doctrine-review", reportPath]);
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(ok.stdout.trim(), "OK");

    writeYaml(reportPath, {
      findings: [],
      filesRead: [{ path: "src/parser.ts", mode: "full" }],
    });
    const missingMachinery = runCli(["validate", "doctrine-review", reportPath]);
    assert.equal(missingMachinery.status, 1);
    assert.match(missingMachinery.stderr, /machinery/);

    writeYaml(reportPath, {
      findings: [
        {
          id: "F1",
          file: "src/parser.ts",
          line: 12,
          rule: "coding/fix-the-root-cause-not-the-symptom.md",
          problem: "Wrong rule.",
          harm: "Not library Law.",
          fix: "Fix it.",
          files: ["src/parser.ts"],
          do: "fix",
        },
      ],
      filesRead: [{ path: "src/parser.ts", mode: "full" }],
      machinery: [
        { file: "src/parser.ts", symbol: "parseSpec", status: "broken", findingId: "F1" },
      ],
    });
    const wrongRule = runCli(["validate", "doctrine-review", reportPath]);
    assert.equal(wrongRule.status, 1);
    assert.match(wrongRule.stderr, /use-a-maintained-library-before-building-machinery\.md/);
  });

  it("validates cycle-critic reports and rejects inconsistent PASS", () => {
    const dir = makeTempDir("cycle-critic");
    const reportPath = path.join(dir, "cycle-critic.yaml");

    writeYaml(reportPath, {
      ran: [{ cmd: "pnpm test", exit: 0 }],
      findings: [
        {
          findingId: "F1",
          report: "review-1.yaml",
          verdict: "FIXED",
          detail: "Confirmed fix.",
        },
      ],
      verdict: "PASS",
    });
    assert.equal(runCli(["validate", "cycle-critic", reportPath]).status, 0);

    writeYaml(reportPath, {
      ran: [{ cmd: "pnpm test", exit: 0 }],
      findings: [
        {
          findingId: "F1",
          report: "review-1.yaml",
          verdict: "STILL_THERE",
          detail: "Bug remains.",
        },
      ],
      verdict: "PASS",
    });
    const invalid = runCli(["validate", "cycle-critic", reportPath]);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stderr, /findings\[0\]\.verdict:.*verdict cannot be "PASS"/);
  });

  it("validates go-audit against --spec and requires --spec", () => {
    const dir = makeTempDir("go-audit");
    const specPath = path.join(dir, "spec.yaml");
    const auditPath = path.join(dir, "go-audit.yaml");
    writeYaml(specPath, makeValidSpec());

    writeYaml(auditPath, {
      tldr: "Built P1.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "pnpm --dir lib/contracts test", exit: 0, pieces: ["P1"] }],
      builtPieces: ["P1"],
    });

    assert.equal(runCli(["validate", "go-audit", auditPath, "--spec", specPath]).status, 0);

    const noSpec = runCli(["validate", "go-audit", auditPath]);
    assert.equal(noSpec.status, 2);
    assert.match(noSpec.stderr, /--spec <spec\.yaml> is required/);

    writeYaml(auditPath, {
      tldr: "Built P1.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [],
      checked: [{ cmd: "pnpm --dir lib/contracts test", exit: 0, pieces: ["P1"] }],
      builtPieces: ["P1"],
    });
    const missingDecision = runCli(["validate", "go-audit", auditPath, "--spec", specPath]);
    assert.equal(missingDecision.status, 1);
    assert.match(missingDecision.stderr, /decisions:.*missing spec decision "D1"/);
  });

  it("validates cycle-audit with optional --spec and --run reading review-*.yaml", () => {
    const dir = makeTempDir("cycle-audit");
    const specPath = path.join(dir, "spec.yaml");
    const runDir = path.join(dir, "run");
    const auditPath = path.join(dir, "cycle-audit.yaml");
    writeYaml(specPath, makeValidSpec());

    // Review files in runDir (plus a non-review YAML file that should be ignored)
    writeYaml(path.join(runDir, "review-1.yaml"), {
      findings: [
        {
          id: "F1",
          file: "lib/contracts/src/cli.ts",
          line: 10,
          problem: "Bug.",
          harm: "Wrong exit code.",
          fix: "Return 2.",
          files: ["lib/contracts/src/cli.ts"],
          do: "fix",
        },
        {
          id: "F2",
          file: "lib/contracts/src/cli.ts",
          line: 20,
          problem: "Style nit.",
          harm: "Minor.",
          fix: "Rename var.",
          files: ["lib/contracts/src/cli.ts"],
          do: "nit",
        },
      ],
      filesRead: [{ path: "lib/contracts/src/cli.ts", mode: "full" }],
    });
    writeYaml(path.join(runDir, "other.yaml"), { ignored: true });

    // Without --spec
    writeYaml(auditPath, {
      tldr: "Reviewed uncommitted work.",
      fixed: [{ findingId: "F1", report: "review-1.yaml", summary: "Returned exit code 2." }],
      gate: "green",
      specStatus: { status: "none" },
    });
    assert.equal(runCli(["validate", "cycle-audit", auditPath, "--run", runDir]).status, 0);

    // With --spec and --run, all accounted
    writeYaml(auditPath, {
      tldr: "Reviewed and built spec.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "pnpm --dir lib/contracts test", exit: 0, pieces: ["P1"] }],
      builtPieces: ["P1"],
      fixed: [{ findingId: "F1", report: "review-1.yaml", summary: "Returned exit code 2." }],
      gate: "green",
      specStatus: { status: "built" },
    });
    assert.equal(
      runCli(["validate", "cycle-audit", auditPath, "--spec", specPath, "--run", runDir]).status,
      0,
    );

    // Omitting do: fix finding F1 fails with exit 1
    writeYaml(auditPath, {
      tldr: "Reviewed and built spec.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "pnpm --dir lib/contracts test", exit: 0, pieces: ["P1"] }],
      builtPieces: ["P1"],
      fixed: [],
      gate: "green",
      specStatus: { status: "built" },
    });
    const omitted = runCli([
      "validate",
      "cycle-audit",
      auditPath,
      "--spec",
      specPath,
      "--run",
      runDir,
    ]);
    assert.equal(omitted.status, 1);
    assert.match(omitted.stderr, /review finding "F1" from "review-1\.yaml".*missing/);

    // Missing --run directory exits 2
    const badRunDir = runCli([
      "validate",
      "cycle-audit",
      auditPath,
      "--run",
      path.join(dir, "missing-run"),
    ]);
    assert.equal(badRunDir.status, 2);
    assert.match(badRunDir.stderr, /Failed to read run directory/);

    // Invalid review-*.yaml in --run exits 2
    writeYaml(path.join(runDir, "review-bad.yaml"), { invalid: true });
    const badReview = runCli(["validate", "cycle-audit", auditPath, "--run", runDir]);
    assert.equal(badReview.status, 2);
    assert.match(badReview.stderr, /Invalid review report review-bad\.yaml/);
  });
});

describe("spec-ctl render", () => {
  it("renders spec, go-audit, and cycle-audit as Markdown and exits 1 on invalid YAML", () => {
    const dir = makeTempDir("render");

    const specPath = path.join(dir, "spec.yaml");
    writeYaml(specPath, makeValidSpec());
    const specRes = runCli(["render", "spec", specPath]);
    assert.equal(specRes.status, 0);
    assert.match(specRes.stdout, /^# Spec: YAML pipeline contracts/m);
    assert.match(specRes.stdout, /\*\*Status:\*\* agreed/);
    assert.match(specRes.stdout, /### P1 Core CLI/);

    // Invalid structural spec exits 1 on render
    const badSpecPath = path.join(dir, "bad-spec.yaml");
    writeYaml(badSpecPath, makeValidSpec({ status: "draft" }));
    assert.equal(runCli(["render", "spec", badSpecPath]).status, 1);

    const goAuditPath = path.join(dir, "go-audit.yaml");
    writeYaml(goAuditPath, {
      tldr: "Built P1.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "pnpm --dir lib/contracts test", exit: 0 }],
      builtPieces: ["P1"],
    });
    const goAuditRes = runCli(["render", "go-audit", goAuditPath]);
    assert.equal(goAuditRes.status, 0);
    assert.match(goAuditRes.stdout, /^## TLDR\nBuilt P1\./m);
    assert.match(goAuditRes.stdout, /\*\*Built pieces:\*\* P1/);

    const badGoAuditPath = path.join(dir, "bad-go-audit.yaml");
    writeYaml(badGoAuditPath, { tldr: "Missing pieces" });
    assert.equal(runCli(["render", "go-audit", badGoAuditPath]).status, 1);

    const cycleAuditPath = path.join(dir, "cycle-audit.yaml");
    writeYaml(cycleAuditPath, {
      tldr: "Clean cycle.",
      gate: "green",
      specStatus: { status: "none" },
    });
    const cycleAuditRes = runCli(["render", "cycle-audit", cycleAuditPath]);
    assert.equal(cycleAuditRes.status, 0);
    assert.match(cycleAuditRes.stdout, /^## TLDR\nClean cycle\./m);
    assert.match(cycleAuditRes.stdout, /\*\*Spec:\*\* none/);

    const badCycleAuditPath = path.join(dir, "bad-cycle-audit.yaml");
    writeYaml(badCycleAuditPath, { tldr: "Missing gate" });
    assert.equal(runCli(["render", "cycle-audit", badCycleAuditPath]).status, 1);

    const missingRenderFile = runCli(["render", "spec", path.join(dir, "missing.yaml")]);
    assert.equal(missingRenderFile.status, 2);
    assert.match(missingRenderFile.stderr, /Failed to read/);
  });
});

describe("spec-ctl usage errors", () => {
  it("exits 2 on unknown kinds, unknown commands, and missing arguments, and 0 on --help", () => {
    const dir = makeTempDir("usage");
    const specPath = path.join(dir, "spec.yaml");
    writeYaml(specPath, makeValidSpec());

    assert.equal(runCli(["--help"]).status, 0);
    assert.equal(runCli(["validate", "unknown-kind", specPath]).status, 2);
    assert.equal(runCli(["render", "unknown-kind", specPath]).status, 2);
    assert.equal(runCli(["nope"]).status, 2);
    assert.equal(runCli(["validate"]).status, 2);
  });
});
