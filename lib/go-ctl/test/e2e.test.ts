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
const GO_CTL_MJS = path.resolve(__dirname, "../../../skills/go/scripts/go-ctl.mjs");
const EXPECTED_DEFAULT_SKILL_DIR = path.resolve(__dirname, "../../../skills/go");

const tmpDirs: string[] = [];

const makeTempGitRepo = (prefix: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `go-ctl-e2e-${prefix}-`));
  tmpDirs.push(dir);
  const initRes = spawnSync("git", ["init", "-q"], { cwd: dir, encoding: "utf8" });
  assert.equal(initRes.status, 0, initRes.stderr);
  return fs.realpathSync(dir);
};

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const runGoCtl = (
  args: string[],
  cwd: string,
): { status: number | null; stdout: string; stderr: string } => {
  const res = spawnSync(process.execPath, [GO_CTL_MJS, ...args], {
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

const readYaml = (filePath: string): unknown => YAML.parse(fs.readFileSync(filePath, "utf8"));

const InitOutputSchema = z.object({ run: z.string().min(1) }).strict();

const StopOutputSchema = z
  .object({
    action: z.literal("stop"),
    reason: z.string().min(1),
    openAsks: z.array(z.object({ id: z.string() }).passthrough()).optional(),
    details: z.array(z.string()).optional(),
  })
  .strict();

const SpawnOutputSchema = z
  .object({
    action: z.literal("spawn"),
    parallel: z.boolean(),
    subagents: z.array(
      z
        .object({
          role: z.enum(["builder", "critic", "auditor"]),
          piece: z.string().min(1),
          attempt: z.union([z.literal(1), z.literal(2)]).optional(),
          brief: z.string().min(1),
        })
        .strict(),
    ),
  })
  .strict();

const RelayOutputSchema = z
  .object({
    action: z.literal("relay"),
    report: z.string().min(1),
  })
  .strict();

const makeSpecData = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  title: "E2E Go Spec",
  status: "agreed",
  intent: "Verify go-ctl end-to-end.",
  decisions: [
    {
      id: "D1",
      title: "Pure core",
      what: "Keep transitions pure.",
      why: "Deterministic tests.",
      decidedBy: "agreed",
    },
  ],
  openAsks: [],
  builtPieces: [],
  pieces: [
    {
      id: "P1",
      name: "Piece one",
      owns: ["src/one.ts"],
      after: [],
      now: "missing",
      reuse: "none",
      change: "create src/one.ts",
      proof: "test one",
    },
    {
      id: "P2",
      name: "Piece two",
      owns: ["src/two.ts"],
      after: [],
      now: "missing",
      reuse: "none",
      change: "create src/two.ts",
      proof: "test two",
    },
    {
      id: "P3",
      name: "Piece three",
      owns: ["src/three.ts"],
      after: ["P1", "P2"],
      now: "missing",
      reuse: "none",
      change: "create src/three.ts",
      proof: "test three",
    },
  ],
  doneMeans: [{ cmd: "pnpm test", proves: "tests pass" }],
  ...overrides,
});

describe("go-ctl init", () => {
  it("stops without modifying spec or creating run dir when spec is draft", () => {
    const repo = makeTempGitRepo("draft");
    const specPath = path.join(repo, ".plans", "spec-draft.yaml");
    writeYaml(
      specPath,
      makeSpecData({
        status: "draft",
        openAsks: [
          {
            id: "A1",
            question: "Which format?",
            rec: "YAML",
            settledBy: "user",
          },
        ],
      }),
    );

    const res = runGoCtl(["init", ".plans/spec-draft.yaml"], repo);
    assert.equal(res.status, 0, res.stderr);
    const out = StopOutputSchema.parse(YAML.parse(res.stdout));
    assert.equal(out.openAsks?.length, 1);
    assert.equal(out.openAsks?.[0]?.id, "A1");

    const specAfter = SpecSchema.parse(readYaml(specPath));
    assert.equal(specAfter.status, "draft");
    assert.equal(fs.existsSync(path.join(repo, ".plans", "scratch", "spec-draft", "go")), false);
  });

  it("stops without modifying spec or creating run dir when spec is built", () => {
    const repo = makeTempGitRepo("built");
    const specPath = path.join(repo, ".plans", "spec-built.yaml");
    writeYaml(
      specPath,
      makeSpecData({
        status: "built",
        builtPieces: ["P1", "P2", "P3"],
      }),
    );

    const res = runGoCtl(["init", ".plans/spec-built.yaml"], repo);
    assert.equal(res.status, 0, res.stderr);
    const out = StopOutputSchema.parse(YAML.parse(res.stdout));
    assert.ok(out.reason.includes("built"));

    const specAfter = SpecSchema.parse(readYaml(specPath));
    assert.equal(specAfter.status, "built");
    assert.equal(fs.existsSync(path.join(repo, ".plans", "scratch", "spec-built", "go")), false);
  });

  it("stops with validation details on an invalid spec and exits 2 on a missing spec", () => {
    const repo = makeTempGitRepo("invalid");
    const invalidPath = path.join(repo, ".plans", "spec-bad.yaml");
    writeYaml(invalidPath, { title: "Incomplete" });

    const invalidRes = runGoCtl(["init", ".plans/spec-bad.yaml"], repo);
    assert.equal(invalidRes.status, 0, invalidRes.stderr);
    const out = StopOutputSchema.parse(YAML.parse(invalidRes.stdout));
    assert.ok(out.details !== undefined && out.details.length > 0);
    assert.equal(fs.existsSync(path.join(repo, ".plans", "scratch", "spec-bad", "go")), false);

    const missingRes = runGoCtl(["init", ".plans/missing.yaml"], repo);
    assert.equal(missingRes.status, 2);
    assert.ok(missingRes.stderr.length > 0);

    const missingRunRes = runGoCtl(["next", path.join(repo, ".plans", "scratch", "nope")], repo);
    assert.equal(missingRunRes.status, 2);
    assert.ok(missingRunRes.stderr.length > 0);
  });

  it("honours --skill override on init", () => {
    const repo = makeTempGitRepo("skill-override");
    const specPath = path.join(repo, ".plans", "spec-skill.yaml");
    writeYaml(specPath, makeSpecData({ status: "agreed" }));

    const customSkill = path.join(repo, "custom-go-skill");
    const res = runGoCtl(["init", ".plans/spec-skill.yaml", "--skill", customSkill], repo);
    assert.equal(res.status, 0, res.stderr);
    const { run: runDir } = InitOutputSchema.parse(YAML.parse(res.stdout));
    const stateJson: unknown = JSON.parse(fs.readFileSync(path.join(runDir, "state.json"), "utf8"));
    assert.equal(z.object({ skillDir: z.string() }).parse(stateJson).skillDir, customSkill);
  });

  it("transitions agreed -> building, ignores .plans/, archives prior run, and defaults skillDir", () => {
    const repo = makeTempGitRepo("init-ok");
    const specPath = path.join(repo, ".plans", "spec-demo.yaml");
    writeYaml(specPath, makeSpecData({ status: "agreed" }));

    const first = runGoCtl(["init", ".plans/spec-demo.yaml"], repo);
    assert.equal(first.status, 0, first.stderr);
    const firstOut = InitOutputSchema.parse(YAML.parse(first.stdout));
    const expectedRunDir = path.join(repo, ".plans", "scratch", "spec-demo", "go");
    assert.equal(firstOut.run, expectedRunDir);

    const specAfterFirst = SpecSchema.parse(readYaml(specPath));
    assert.equal(specAfterFirst.status, "building");

    const ignoreCheck = spawnSync("git", ["-C", repo, "check-ignore", "-q", ".plans/"], {
      encoding: "utf8",
    });
    assert.equal(ignoreCheck.status, 0);
    assert.equal(fs.existsSync(path.join(expectedRunDir, "status-before.txt")), true);

    const stateJson: unknown = JSON.parse(
      fs.readFileSync(path.join(expectedRunDir, "state.json"), "utf8"),
    );
    const stateCheck = z.object({ skillDir: z.string() }).parse(stateJson);
    assert.equal(stateCheck.skillDir, EXPECTED_DEFAULT_SKILL_DIR);

    // Marker file to verify archiving on second init.
    fs.writeFileSync(path.join(expectedRunDir, "old-marker.txt"), "old\n", "utf8");

    const second = runGoCtl(["init", ".plans/spec-demo.yaml"], repo);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(fs.existsSync(path.join(expectedRunDir, "old-marker.txt")), false);

    const scratchParent = path.join(repo, ".plans", "scratch", "spec-demo");
    const archived = fs
      .readdirSync(scratchParent)
      .filter((name) => name.startsWith("go-") && name !== "go");
    assert.equal(archived.length, 1);
    const archivedDir = archived[0];
    assert.ok(archivedDir !== undefined);
    assert.equal(fs.existsSync(path.join(scratchParent, archivedDir, "old-marker.txt")), true);
  });
});

describe("go-ctl next full multi-piece loop, compaction recovery, and validate/render", () => {
  it("runs a full multi-piece spec with retry, compaction recovery, and contract subcommands", () => {
    const repo = makeTempGitRepo("full-loop");
    const specPath = path.join(repo, ".plans", "spec-loop.yaml");
    writeYaml(specPath, makeSpecData({ status: "agreed" }));

    const initRes = runGoCtl(["init", ".plans/spec-loop.yaml"], repo);
    assert.equal(initRes.status, 0, initRes.stderr);
    const { run: runDir } = InitOutputSchema.parse(YAML.parse(initRes.stdout));

    // Round 1: P1 and P2 in parallel.
    const step1 = runGoCtl(["next", runDir], repo);
    assert.equal(step1.status, 0, step1.stderr);
    const spawn1 = SpawnOutputSchema.parse(YAML.parse(step1.stdout));
    assert.equal(spawn1.parallel, true);
    assert.deepEqual(
      spawn1.subagents.map((s) => s.piece),
      ["P1", "P2"],
    );

    const buildP1Path = path.join(runDir, "build-P1-1.yaml");
    const buildP2Path = path.join(runDir, "build-P2-1.yaml");
    writeYaml(buildP1Path, {
      piece: "P1",
      attempt: 1,
      changed: [{ path: "src/one.ts", summary: "created" }],
      decisionsBuilt: [{ id: "D1", summary: "pure" }],
      ran: [{ cmd: "pnpm test", exit: 0 }],
      result: "BUILT",
    });
    writeYaml(buildP2Path, {
      piece: "P2",
      attempt: 1,
      changed: [{ path: "src/two.ts", summary: "created" }],
      decisionsBuilt: [{ id: "D1", summary: "pure" }],
      ran: [{ cmd: "pnpm test", exit: 0 }],
      result: "BUILT",
    });

    // Verify bundled validate build works.
    const valBuild = runGoCtl(["validate", "build", buildP1Path], repo);
    assert.equal(valBuild.status, 0, valBuild.stderr);
    assert.equal(valBuild.stdout.trim(), "OK");

    // Critic P1 (attempt 1).
    const step2 = runGoCtl(["next", runDir], repo);
    assert.equal(step2.status, 0, step2.stderr);
    const spawn2 = SpawnOutputSchema.parse(YAML.parse(step2.stdout));
    assert.equal(spawn2.parallel, false);
    assert.equal(spawn2.subagents[0]?.role, "critic");
    assert.equal(spawn2.subagents[0]?.piece, "P1");

    const criticP1Path = path.join(runDir, "critic-P1-1.yaml");
    writeYaml(criticP1Path, {
      piece: "P1",
      attempt: 1,
      ran: [{ cmd: "pnpm test", exit: 0 }],
      verdict: "PASS",
    });

    const valCritic = runGoCtl(["validate", "go-critic", criticP1Path], repo);
    assert.equal(valCritic.status, 0, valCritic.stderr);
    assert.equal(valCritic.stdout.trim(), "OK");

    // P1 persisted to spec.yaml builtPieces; critic P2 spawned next.
    const step3 = runGoCtl(["next", runDir], repo);
    assert.equal(step3.status, 0, step3.stderr);
    assert.deepEqual(SpecSchema.parse(readYaml(specPath)).builtPieces, ["P1"]);
    const spawn3 = SpawnOutputSchema.parse(YAML.parse(step3.stdout));
    assert.equal(spawn3.subagents[0]?.role, "critic");
    assert.equal(spawn3.subagents[0]?.piece, "P2");

    // P2 fails critic 1 -> attempt 2 builder.
    writeYaml(path.join(runDir, "critic-P2-1.yaml"), {
      piece: "P2",
      attempt: 1,
      missing: ["edge case"],
      verdict: "FAIL",
    });

    const step4 = runGoCtl(["next", runDir], repo);
    assert.equal(step4.status, 0, step4.stderr);
    const spawn4 = SpawnOutputSchema.parse(YAML.parse(step4.stdout));
    assert.equal(spawn4.subagents[0]?.role, "builder");
    assert.equal(spawn4.subagents[0]?.piece, "P2");
    assert.equal(spawn4.subagents[0]?.attempt, 2);

    writeYaml(path.join(runDir, "build-P2-2.yaml"), {
      piece: "P2",
      attempt: 2,
      changed: [{ path: "src/two.ts", summary: "fixed edge case" }],
      result: "BUILT",
    });

    const step5 = runGoCtl(["next", runDir], repo);
    assert.equal(step5.status, 0, step5.stderr);
    const spawn5 = SpawnOutputSchema.parse(YAML.parse(step5.stdout));
    assert.equal(spawn5.subagents[0]?.role, "critic");
    assert.equal(spawn5.subagents[0]?.piece, "P2");
    assert.equal(spawn5.subagents[0]?.attempt, 2);

    writeYaml(path.join(runDir, "critic-P2-2.yaml"), {
      piece: "P2",
      attempt: 2,
      verdict: "PASS",
    });

    // P2 persisted to builtPieces; Round 2 spawns P3.
    const step6 = runGoCtl(["next", runDir], repo);
    assert.equal(step6.status, 0, step6.stderr);
    assert.deepEqual(SpecSchema.parse(readYaml(specPath)).builtPieces, ["P1", "P2"]);
    const spawn6 = SpawnOutputSchema.parse(YAML.parse(step6.stdout));
    assert.equal(spawn6.subagents[0]?.role, "builder");
    assert.equal(spawn6.subagents[0]?.piece, "P3");
    assert.equal(spawn6.subagents[0]?.attempt, 1);

    writeYaml(path.join(runDir, "build-P3-1.yaml"), {
      piece: "P3",
      attempt: 1,
      changed: [{ path: "src/three.ts", summary: "created" }],
      result: "BUILT",
    });

    const step7 = runGoCtl(["next", runDir], repo);
    assert.equal(step7.status, 0, step7.stderr);
    const spawn7 = SpawnOutputSchema.parse(YAML.parse(step7.stdout));
    assert.equal(spawn7.subagents[0]?.role, "critic");
    assert.equal(spawn7.subagents[0]?.piece, "P3");

    writeYaml(path.join(runDir, "critic-P3-1.yaml"), {
      piece: "P3",
      attempt: 1,
      verdict: "PASS",
    });

    // All pieces built -> spawns auditor.
    const step8 = runGoCtl(["next", runDir], repo);
    assert.equal(step8.status, 0, step8.stderr);
    assert.deepEqual(SpecSchema.parse(readYaml(specPath)).builtPieces, ["P1", "P2", "P3"]);
    const spawn8 = SpawnOutputSchema.parse(YAML.parse(step8.stdout));
    assert.equal(spawn8.subagents[0]?.role, "auditor");
    assert.equal(spawn8.subagents[0]?.piece, "all");

    const auditPath = path.join(runDir, "audit.yaml");
    writeYaml(auditPath, {
      tldr: "All three pieces built and verified.",
      pieces: [
        { id: "P1", status: "done" },
        { id: "P2", status: "done" },
        { id: "P3", status: "done" },
      ],
      decisions: [{ id: "D1", status: "honoured" }],
      checked: [{ cmd: "pnpm test", exit: 0 }],
      builtPieces: ["P1", "P2", "P3"],
    });

    const valAudit = runGoCtl(["validate", "go-audit", auditPath, "--spec", specPath], repo);
    assert.equal(valAudit.status, 0, valAudit.stderr);
    assert.equal(valAudit.stdout.trim(), "OK");

    const renderAudit = runGoCtl(["render", "go-audit", auditPath], repo);
    assert.equal(renderAudit.status, 0, renderAudit.stderr);
    assert.ok(renderAudit.stdout.includes("## TLDR"));
    assert.ok(renderAudit.stdout.includes("**Built pieces:** P1, P2, P3"));

    // Final next -> renders report.md and emits relay.
    const step9 = runGoCtl(["next", runDir], repo);
    assert.equal(step9.status, 0, step9.stderr);
    const relay = RelayOutputSchema.parse(YAML.parse(step9.stdout));
    assert.equal(relay.report, path.join(runDir, "report.md"));
    const reportMd = fs.readFileSync(relay.report, "utf8");
    assert.equal(reportMd, renderAudit.stdout);

    // Compaction recovery: repeated next after done returns the same relay action.
    const repeat = runGoCtl(["next", runDir], repo);
    assert.equal(repeat.status, 0, repeat.stderr);
    assert.deepEqual(RelayOutputSchema.parse(YAML.parse(repeat.stdout)), relay);
  });
});
