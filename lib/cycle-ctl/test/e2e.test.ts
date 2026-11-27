import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { z } from "zod";
import { SpecSchema } from "../../contracts/src/spec-schema.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CYCLE_CTL_MJS = path.resolve(__dirname, "../../../skills/cycle/scripts/cycle-ctl.mjs");

const tmpDirs: string[] = [];

const makeTempRepo = (prefix: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cycle-ctl-e2e-${prefix}-`));
  tmpDirs.push(dir);

  const git = (args: string[]): void => {
    const res = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(res.status, 0, `git ${args.join(" ")} failed: ${res.stderr}`);
  };

  git(["init", "-q"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "Test User"]);
  fs.writeFileSync(path.join(dir, "README.md"), "# Demo\n", "utf8");
  git(["add", "README.md"]);
  git(["commit", "-q", "-m", "chore: initial commit"]);

  return dir;
};

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const runCtl = (
  args: string[],
  cwd: string,
): { status: number | null; stdout: string; stderr: string } => {
  const res = spawnSync(process.execPath, [CYCLE_CTL_MJS, ...args], {
    cwd,
    encoding: "utf8",
  });
  return { status: res.status, stdout: res.stdout, stderr: res.stderr };
};

const writeYaml = (filePath: string, data: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, YAML.stringify(data, { lineWidth: 0 }), "utf8");
};

const makeSpec = (
  status: "draft" | "agreed" | "building" | "built" = "building",
): Record<string, unknown> => ({
  title: "Demo feature",
  status,
  intent: "Ship demo feature.",
  decisions: [
    {
      id: "D1",
      title: "Pure logic",
      what: "Keep logic pure.",
      why: "Easy to test.",
      decidedBy: "agreed",
    },
  ],
  openAsks:
    status === "draft"
      ? [{ id: "A1", question: "Which format?", rec: "YAML", settledBy: "user" }]
      : [],
  builtPieces: status === "built" ? ["P1"] : [],
  pieces: [
    {
      id: "P1",
      name: "Core",
      owns: ["src/a.ts"],
      after: [],
      now: "Missing.",
      reuse: "None.",
      change: "Add src/a.ts.",
      proof: "node -e 'process.exit(0)'",
    },
  ],
  doneMeans: [{ cmd: "node -e 'process.exit(0)'", proves: "Smoke check." }],
});

const InitRunSchema = z.object({ run: z.string().min(1) });
const StopActionSchema = z.object({
  action: z.literal("stop"),
  reason: z.string().min(1),
  details: z.array(z.string()).optional(),
});
const SliceActionSchema = z.object({
  action: z.literal("slice"),
  scopeFile: z.string(),
  slicesFile: z.string(),
  errors: z.array(z.string()),
  schema: z.object({
    slices: z.string(),
    stacks: z.object({
      backend: z.string(),
      frontend: z.string(),
    }),
    maxPerFile: z.number(),
    maxLinesPerList: z.number(),
  }),
  fileLines: z.record(z.string(), z.number()),
});
const SpawnActionSchema = z.object({
  action: z.literal("spawn"),
  parallel: z.boolean(),
  subagents: z.array(
    z.object({
      role: z.string(),
      brief: z.string(),
      report: z.string(),
    }),
  ),
});
const CommitActionSchema = z.object({
  action: z.literal("commit"),
  listFile: z.string(),
  messageFile: z.string(),
  diffStat: z.string(),
  changes: z.array(z.string()),
  commitRule: z.string(),
  specPath: z.string().nullable(),
});
const GateActionSchema = z.object({
  action: z.literal("gate"),
  logFile: z.string(),
});
const RelayActionSchema = z.object({
  action: z.literal("relay"),
  report: z.string(),
});

describe("cycle-ctl e2e: init guards", () => {
  it("stops on non-building spec and creates no run directory", () => {
    const repo = makeTempRepo("non-building");
    fs.mkdirSync(path.join(repo, "src"), { recursive: true });
    fs.writeFileSync(path.join(repo, "src/a.ts"), "export const a = 1;\n", "utf8");

    const specPath = path.join(repo, ".plans", "spec-demo.yaml");
    writeYaml(specPath, makeSpec("agreed"));

    const res = runCtl(["init", "--spec", ".plans/spec-demo.yaml"], repo);
    assert.equal(res.status, 0, res.stderr);
    const parsed = StopActionSchema.parse(YAML.parse(res.stdout));
    assert.match(parsed.reason, /building/);
    assert.equal(fs.existsSync(path.join(repo, ".plans", "scratch")), false);
  });

  it("stops on incomplete go/audit.yaml (not-built Decision, unfinished Piece, open finding, invalid YAML)", () => {
    const repo = makeTempRepo("go-audit-guard");
    fs.mkdirSync(path.join(repo, "src"), { recursive: true });
    fs.writeFileSync(path.join(repo, "src/a.ts"), "export const a = 1;\n", "utf8");

    const specPath = path.join(repo, ".plans", "spec-demo.yaml");
    writeYaml(specPath, makeSpec("building"));

    const goAuditPath = path.join(repo, ".plans", "scratch", "spec-demo", "go", "audit.yaml");

    // Case 1: not-built Decision
    writeYaml(goAuditPath, {
      tldr: "Built P1 but skipped D1.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "not-built", note: "Skipped" }],
      checked: [{ cmd: "node -e 'process.exit(0)'", exit: 0, pieces: ["P1"] }],
      builtPieces: ["P1"],
    });
    const stopDecision = runCtl(["init", "--spec", ".plans/spec-demo.yaml"], repo);
    assert.equal(stopDecision.status, 0, stopDecision.stderr);
    const parsedDecision = StopActionSchema.parse(YAML.parse(stopDecision.stdout));
    assert.ok(parsedDecision.details?.some((d) => d.includes("Decision D1 is not-built")));

    // Case 2: Piece with status "needs-user"
    writeYaml(goAuditPath, {
      tldr: "P1 needs user.",
      pieces: [{ id: "P1", status: "needs-user", note: "Check credentials" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "node -e 'process.exit(0)'", exit: 0 }],
      builtPieces: [],
    });
    const stopPiece = runCtl(["init", "--spec", ".plans/spec-demo.yaml"], repo);
    assert.equal(stopPiece.status, 0);
    const parsedPiece = StopActionSchema.parse(YAML.parse(stopPiece.stdout));
    assert.ok(parsedPiece.details?.some((d) => d.includes('Piece P1 has status "needs-user"')));

    // Case 3: Open finding
    writeYaml(goAuditPath, {
      tldr: "Open finding.",
      findings: [{ title: "Broken premise", detail: "Missing config." }],
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "node -e 'process.exit(0)'", exit: 0, pieces: ["P1"] }],
      builtPieces: ["P1"],
    });
    const stopFinding = runCtl(["init", "--spec", ".plans/spec-demo.yaml"], repo);
    assert.equal(stopFinding.status, 0);
    const parsedFinding = StopActionSchema.parse(YAML.parse(stopFinding.stdout));
    assert.ok(parsedFinding.details?.some((d) => d.includes("Open finding: Broken premise")));

    // Case 4: Unreadable/invalid YAML
    fs.writeFileSync(goAuditPath, "tldr: [unclosed\n", "utf8");
    const stopCorrupt = runCtl(["init", "--spec", ".plans/spec-demo.yaml"], repo);
    assert.equal(stopCorrupt.status, 0);
    const parsedCorrupt = StopActionSchema.parse(YAML.parse(stopCorrupt.stdout));
    assert.match(parsedCorrupt.reason, /unreadable/i);
  });

  it("stops on 0 dirty files and when all dirty files are excluded", () => {
    const repo = makeTempRepo("clean-tree");
    const cleanRes = runCtl(["init"], repo);
    assert.equal(cleanRes.status, 0);
    const parsedClean = StopActionSchema.parse(YAML.parse(cleanRes.stdout));
    assert.match(parsedClean.reason, /Nothing to cycle/);

    fs.writeFileSync(path.join(repo, "local.secret"), "token\n", "utf8");
    const excludedRes = runCtl(["init", "--exclude", "local.secret"], repo);
    assert.equal(excludedRes.status, 0);
    const parsedExcluded = StopActionSchema.parse(YAML.parse(excludedRes.stdout));
    assert.match(parsedExcluded.reason, /Nothing to cycle/);
  });
});

describe("cycle-ctl e2e: full cycle with real git commits", () => {
  it("runs review -> commit -> fix -> critic -> re-review -> commit -> gate -> audit -> relay, isolates other-session files, and marks spec built", () => {
    const repo = makeTempRepo("full-flow");
    fs.mkdirSync(path.join(repo, "src"), { recursive: true });
    fs.writeFileSync(path.join(repo, "src/a.ts"), "export const a = 1;\n", "utf8");

    const specPath = path.join(repo, ".plans", "spec-demo.yaml");
    writeYaml(specPath, makeSpec("building"));

    // Clean /go audit passes the guard
    const goAuditPath = path.join(repo, ".plans", "scratch", "spec-demo", "go", "audit.yaml");
    writeYaml(goAuditPath, {
      tldr: "Built P1.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "node -e 'process.exit(0)'", exit: 0, pieces: ["P1"] }],
      builtPieces: ["P1"],
    });

    // 1. init (auto-slices <= 15)
    const initRes = runCtl(["init", "--spec", ".plans/spec-demo.yaml"], repo);
    assert.equal(initRes.status, 0, initRes.stderr);
    const { run } = InitRunSchema.parse(YAML.parse(initRes.stdout));

    assert.equal(fs.readFileSync(path.join(run, "scope.txt"), "utf8").trim(), "src/a.ts");
    assert.equal(fs.readFileSync(path.join(run, "slice-1.txt"), "utf8").trim(), "src/a.ts");
    assert.equal(fs.readFileSync(path.join(run, "stack-backend.txt"), "utf8").trim(), "src/a.ts");
    assert.equal(fs.existsSync(path.join(run, "stack-frontend.txt")), false);

    // 2. next -> parallel round-1 reviews
    const reviewStep = runCtl(["next", run], repo);
    assert.equal(reviewStep.status, 0, reviewStep.stderr);
    const reviewSpawn = SpawnActionSchema.parse(YAML.parse(reviewStep.stdout));
    assert.equal(reviewSpawn.parallel, true);
    assert.equal(reviewSpawn.subagents.length, 2);
    const sliceReviewer = reviewSpawn.subagents.find((s) => s.role === "reviewer");
    const doctrineReviewer = reviewSpawn.subagents.find(
      (s) => s.role === "doctrine-reviewer-backend",
    );
    assert.ok(sliceReviewer, "expected slice reviewer subagent");
    assert.ok(doctrineReviewer, "expected doctrine-reviewer-backend subagent");
    assert.match(sliceReviewer.brief, /Spec: .*spec-demo\.yaml/);
    assert.match(doctrineReviewer.brief, /Spec: none/);

    writeYaml(path.join(run, "review-1-slice-1.yaml"), {
      findings: [
        {
          id: "F1",
          file: "src/a.ts",
          line: 1,
          problem: "Wrong constant value.",
          harm: "Returns 1 instead of 2.",
          fix: "Change a to 2.",
          files: ["src/a.ts"],
          do: "fix",
        },
      ],
      filesRead: [{ path: "src/a.ts", mode: "full" }],
    });
    writeYaml(path.join(run, "review-1-backend.yaml"), {
      findings: [],
      filesRead: [{ path: "src/a.ts", mode: "full" }],
      machinery: [
        {
          file: "src/a.ts",
          symbol: "BinaryFrameCodec",
          status: "justified",
          candidatesChecked: ["msgpack (3.x)"],
          constraint: "Hardware framing header.",
        },
      ],
    });

    // 3. next -> commit_work
    const commitWorkStep = runCtl(["next", run], repo);
    assert.equal(commitWorkStep.status, 0, commitWorkStep.stderr);
    const commitWorkAction = CommitActionSchema.parse(YAML.parse(commitWorkStep.stdout));
    assert.match(commitWorkAction.diffStat, /src\/a\.ts/);
    assert.deepEqual(commitWorkAction.changes, []);

    fs.writeFileSync(
      commitWorkAction.messageFile,
      "feat(core): add initial demo module\n\nAdds src/a.ts for the demo feature.\n",
      "utf8",
    );
    const commitWorkRun = runCtl(
      ["commit", run, commitWorkAction.listFile, commitWorkAction.messageFile],
      repo,
    );
    assert.equal(commitWorkRun.status, 0, commitWorkRun.stderr);

    // 4. next -> fixer
    const fixStep = runCtl(["next", run], repo);
    assert.equal(fixStep.status, 0, fixStep.stderr);
    const fixSpawn = SpawnActionSchema.parse(YAML.parse(fixStep.stdout));
    assert.equal(fixSpawn.subagents.length, 1);
    assert.equal(fixSpawn.subagents[0]?.role, "fixer");

    // Simulate fixer edit + another session's untracked file appearing mid-run
    fs.writeFileSync(path.join(repo, "src/a.ts"), "export const a = 2;\n", "utf8");
    fs.writeFileSync(
      path.join(repo, "src/other-session.ts"),
      "export const other = true;\n",
      "utf8",
    );
    writeYaml(path.join(run, "fix-1-slice-1.yaml"), {
      results: [
        {
          findingId: "F1",
          report: "review-1-slice-1.yaml",
          status: "FIXED",
          change: "Changed exported constant a from 1 to 2.",
        },
      ],
      changedFiles: ["src/a.ts"],
    });

    // 5. next -> critic
    const criticStep = runCtl(["next", run], repo);
    assert.equal(criticStep.status, 0, criticStep.stderr);
    const criticSpawn = SpawnActionSchema.parse(YAML.parse(criticStep.stdout));
    assert.equal(criticSpawn.parallel, false);
    assert.equal(criticSpawn.subagents[0]?.role, "critic");

    writeYaml(path.join(run, "critic-1-slice-1.yaml"), {
      ran: [{ cmd: "node -e 'process.exit(0)'", exit: 0 }],
      findings: [
        {
          findingId: "F1",
          report: "review-1-slice-1.yaml",
          verdict: "FIXED",
          detail: "a is now 2.",
        },
      ],
      verdict: "PASS",
    });

    // 6. next -> re-review (other-session.ts sorted into left-out.txt!)
    const rereviewStep = runCtl(["next", run], repo);
    assert.equal(rereviewStep.status, 0, rereviewStep.stderr);
    const rereviewSpawn = SpawnActionSchema.parse(YAML.parse(rereviewStep.stdout));
    assert.equal(rereviewSpawn.subagents[0]?.role, "reviewer");
    assert.match(rereviewSpawn.subagents[0]?.brief ?? "", /Mode: fixes/);

    assert.equal(
      fs.readFileSync(path.join(run, "left-out.txt"), "utf8").trim(),
      "src/other-session.ts",
    );
    assert.equal(fs.readFileSync(path.join(run, "fixed-1.txt"), "utf8").trim(), "src/a.ts");

    writeYaml(path.join(run, "review-2-fixes.yaml"), {
      findings: [],
      filesRead: [{ path: "src/a.ts", mode: "diff" }],
    });

    // 7. next -> commit_round with extracted FIXED change
    const commitRoundStep = runCtl(["next", run], repo);
    assert.equal(commitRoundStep.status, 0, commitRoundStep.stderr);
    const commitRoundAction = CommitActionSchema.parse(YAML.parse(commitRoundStep.stdout));
    assert.deepEqual(commitRoundAction.changes, ["Changed exported constant a from 1 to 2."]);

    fs.writeFileSync(
      commitRoundAction.messageFile,
      "fix(core): set constant a to 2\n\nChanged exported constant a from 1 to 2.\n",
      "utf8",
    );
    const commitRoundRun = runCtl(
      ["commit", run, commitRoundAction.listFile, commitRoundAction.messageFile],
      repo,
    );
    assert.equal(commitRoundRun.status, 0, commitRoundRun.stderr);

    // Verify other-session.ts was never committed
    const statusAfter = spawnSync("git", ["status", "--porcelain"], {
      cwd: repo,
      encoding: "utf8",
    });
    assert.match(statusAfter.stdout, /\?\? src\/other-session\.ts/);

    // 8. next -> gate
    const gateStep = runCtl(["next", run], repo);
    assert.equal(gateStep.status, 0, gateStep.stderr);
    const gateAction = GateActionSchema.parse(YAML.parse(gateStep.stdout));
    fs.writeFileSync(gateAction.logFile, "All checks passed.\nGATE EXIT 0\n", "utf8");

    // 9. next -> auditor
    const auditStep = runCtl(["next", run], repo);
    assert.equal(auditStep.status, 0, auditStep.stderr);
    const auditSpawn = SpawnActionSchema.parse(YAML.parse(auditStep.stdout));
    assert.equal(auditSpawn.subagents[0]?.role, "auditor");

    const headSha = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: repo,
      encoding: "utf8",
    }).stdout.trim();
    writeYaml(path.join(run, "audit.yaml"), {
      tldr: "Reviewed, fixed, and verified demo feature.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "node -e 'process.exit(0)'", exit: 0, pieces: ["P1"] }],
      builtPieces: ["P1"],
      commits: [{ sha: headSha, subject: "fix(core): set constant a to 2", bullets: [] }],
      fixed: [
        {
          findingId: "F1",
          report: "review-1-slice-1.yaml",
          summary: "Changed exported constant a from 1 to 2.",
        },
      ],
      gate: "green",
      specStatus: { status: "built" },
    });

    // 10. next -> relay, report.md rendered, spec.yaml marked built
    const relayStep = runCtl(["next", run], repo);
    assert.equal(relayStep.status, 0, relayStep.stderr);
    const relayAction = RelayActionSchema.parse(YAML.parse(relayStep.stdout));
    assert.equal(fs.existsSync(relayAction.report), true);
    const renderedReport = fs.readFileSync(relayAction.report, "utf8");
    assert.match(renderedReport, /\*\*Spec:\*\* built/);

    const updatedSpec = SpecSchema.parse(YAML.parse(fs.readFileSync(specPath, "utf8")));
    assert.equal(updatedSpec.status, "built");
    assert.deepEqual(updatedSpec.builtPieces, ["P1"]);

    // 11. Idempotent next once done
    const replayStep = runCtl(["next", run], repo);
    assert.equal(replayStep.status, 0, replayStep.stderr);
    const replayAction = RelayActionSchema.parse(YAML.parse(replayStep.stdout));
    assert.equal(replayAction.report, relayAction.report);

    // 12. validate and render subcommands work on cycle-ctl.mjs
    const validateRes = runCtl(
      ["validate", "cycle-audit", path.join(run, "audit.yaml"), "--spec", specPath, "--run", run],
      repo,
    );
    assert.equal(validateRes.status, 0, validateRes.stderr);
    assert.equal(validateRes.stdout.trim(), "OK");

    const renderRes = runCtl(["render", "cycle-audit", path.join(run, "audit.yaml")], repo);
    assert.equal(renderRes.status, 0, renderRes.stderr);
    assert.match(renderRes.stdout, /^## TLDR/m);
  });

  it("validate cycle-audit --run skips invalid review reports listed in state.json missedReports", () => {
    const repo = makeTempRepo("missed-review");
    const runDir = path.join(repo, ".plans", "scratch", "cycle-missed-test");
    fs.mkdirSync(runDir, { recursive: true });

    const specPath = path.join(repo, ".plans", "spec-demo.yaml");
    writeYaml(specPath, makeSpec("building"));

    // Write a valid review report and a malformed review report listed in state.json missedReports.
    writeYaml(path.join(runDir, "review-1-slice-1.yaml"), {
      findings: [],
      filesRead: [{ path: "src/a.ts", mode: "full" }],
    });
    fs.writeFileSync(path.join(runDir, "review-1-backend.yaml"), "not: [valid: yaml\n", "utf8");
    fs.writeFileSync(
      path.join(runDir, "state.json"),
      `${JSON.stringify({ missedReports: ["review-1-backend.yaml"] }, null, 2)}\n`,
      "utf8",
    );

    const headSha = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: repo,
      encoding: "utf8",
    }).stdout.trim();
    const auditPath = path.join(runDir, "audit.yaml");
    writeYaml(auditPath, {
      tldr: "Validated audit with a missed review report.",
      pieces: [{ id: "P1", status: "done" }],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "node -e 'process.exit(0)'", exit: 0, pieces: ["P1"] }],
      builtPieces: ["P1"],
      commits: [{ sha: headSha, subject: "chore: initial commit", bullets: [] }],
      fixed: [],
      gate: "green",
      specStatus: { status: "built" },
    });

    const validateRes = runCtl(
      ["validate", "cycle-audit", auditPath, "--spec", specPath, "--run", runDir],
      repo,
    );
    assert.equal(validateRes.status, 0, validateRes.stderr);
    assert.equal(validateRes.stdout.trim(), "OK");

    // Without missedReports listing it, validation must still fail (proves the check is not vacuous).
    fs.writeFileSync(
      path.join(runDir, "state.json"),
      `${JSON.stringify({ missedReports: [] }, null, 2)}\n`,
      "utf8",
    );
    const failRes = runCtl(
      ["validate", "cycle-audit", auditPath, "--spec", specPath, "--run", runDir],
      repo,
    );
    assert.equal(failRes.status, 2);
  });

  it("assigns distinct run directories when cycle-ctl init runs repeatedly in the same second", () => {
    const repo = makeTempRepo("distinct-run-dirs");
    fs.mkdirSync(path.join(repo, "src"), { recursive: true });
    fs.writeFileSync(path.join(repo, "src/a.ts"), "export const a = 1;\n", "utf8");

    const first = runCtl(["init"], repo);
    assert.equal(first.status, 0, first.stderr);
    const second = runCtl(["init"], repo);
    assert.equal(second.status, 0, second.stderr);

    const firstRun = InitRunSchema.parse(YAML.parse(first.stdout)).run;
    const secondRun = InitRunSchema.parse(YAML.parse(second.stdout)).run;
    assert.notEqual(firstRun, secondRun);
  });

  it("enters slice action with fileLines and maxLinesPerList when multi-file diff exceeds 8,000 lines", () => {
    const repo = makeTempRepo("line-budget-slice");
    fs.mkdirSync(path.join(repo, "src"), { recursive: true });
    fs.writeFileSync(path.join(repo, "src/big-a.ts"), "export const x = 1;\n".repeat(4500), "utf8");
    fs.writeFileSync(path.join(repo, "src/big-b.ts"), "export const y = 2;\n".repeat(4500), "utf8");

    const initRes = runCtl(["init"], repo);
    assert.equal(initRes.status, 0, initRes.stderr);
    const { run } = InitRunSchema.parse(YAML.parse(initRes.stdout));

    const nextRes = runCtl(["next", run], repo);
    assert.equal(nextRes.status, 0, nextRes.stderr);
    const sliceAction = SliceActionSchema.parse(YAML.parse(nextRes.stdout));
    assert.equal(sliceAction.schema.maxLinesPerList, 8000);
    assert.equal(sliceAction.fileLines["src/big-a.ts"], 4500);
    assert.equal(sliceAction.fileLines["src/big-b.ts"], 4500);

    // Reject a combined slice over 8,000 lines
    writeYaml(sliceAction.slicesFile, {
      slices: [{ id: 1, files: ["src/big-a.ts", "src/big-b.ts"] }],
      stacks: { backend: ["src/big-a.ts", "src/big-b.ts"], frontend: [] },
    });
    const retryRes = runCtl(["next", run], repo);
    assert.equal(retryRes.status, 0, retryRes.stderr);
    const retryAction = SliceActionSchema.parse(YAML.parse(retryRes.stdout));
    assert.ok(retryAction.errors.some((e) => e.includes("8000")));

    // Accept split slices within 8,000 lines while keeping stacks unsplit
    writeYaml(sliceAction.slicesFile, {
      slices: [
        { id: 1, files: ["src/big-a.ts"] },
        { id: 2, files: ["src/big-b.ts"] },
      ],
      stacks: { backend: ["src/big-a.ts", "src/big-b.ts"], frontend: [] },
    });
    const spawnRes = runCtl(["next", run], repo);
    assert.equal(spawnRes.status, 0, spawnRes.stderr);
    const spawnAction = SpawnActionSchema.parse(YAML.parse(spawnRes.stdout));
    assert.equal(spawnAction.subagents.length, 3);
    const doctrineSubagents = spawnAction.subagents.filter(
      (s) => s.role === "doctrine-reviewer-backend",
    );
    assert.equal(doctrineSubagents.length, 1);
    assert.equal(path.basename(doctrineSubagents[0]?.report ?? ""), "review-1-backend.yaml");
    assert.match(doctrineSubagents[0]?.brief ?? "", /stack-backend\.txt/);
    assert.deepEqual(
      fs.readFileSync(path.join(run, "stack-backend.txt"), "utf8").trim().split("\n"),
      ["src/big-a.ts", "src/big-b.ts"],
    );
  });
});
