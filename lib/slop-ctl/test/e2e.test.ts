import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { z } from "zod";
import { createRunDir } from "../src/io.ts";
import { AreasFileSchema, SlopActionSchema, SlopStateSchema } from "../src/schemas.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SLOP_CTL_MJS = path.resolve(__dirname, "../../../skills/slop-hunt/scripts/slop-ctl.mjs");
const EXPECTED_DEFAULT_SKILL_DIR = path.resolve(__dirname, "../../../skills/slop-hunt");

const tmpDirs: string[] = [];

const git = (args: string[], cwd: string): string => {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(res.status, 0, `git ${args.join(" ")} failed: ${res.stderr}`);
  return res.stdout;
};

const makeTempGitRepo = (prefix: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `slop-ctl-e2e-${prefix}-`));
  tmpDirs.push(dir);
  git(["init", "-q"], dir);
  git(["config", "user.email", "test@example.com"], dir);
  git(["config", "user.name", "Test User"], dir);
  return fs.realpathSync(dir);
};

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const runSlopCtl = (
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv,
): { status: number | null; stdout: string; stderr: string } => {
  const res = spawnSync(process.execPath, [SLOP_CTL_MJS, ...args], {
    cwd,
    encoding: "utf8",
    env: env ?? process.env,
  });
  return {
    status: res.status,
    stdout: res.stdout,
    stderr: res.stderr,
  };
};

const makeFakeBinDir = (prefix: string, scripts: Record<string, string>): string => {
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), `slop-ctl-bin-${prefix}-`));
  tmpDirs.push(binDir);
  for (const [name, body] of Object.entries(scripts)) {
    const scriptPath = path.join(binDir, name);
    fs.writeFileSync(scriptPath, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  }
  return binDir;
};

const envWithBin = (binDir: string): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: `${binDir}:${process.env.PATH ?? ""}`,
});

const writeFile = (root: string, relPath: string, content: string): void => {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf8");
};

const writeLines = (root: string, relPath: string, count: number): void => {
  const lines: string[] = [];
  for (let i = 1; i <= count; i += 1) {
    lines.push(`export const line_${i} = ${i};`);
  }
  writeFile(root, relPath, `${lines.join("\n")}\n`);
};

const writeYaml = (filePath: string, data: unknown): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, YAML.stringify(data, { lineWidth: 0 }), "utf8");
};

const InitOutputSchema = z.strictObject({
  run: z.string().min(1),
  root: z.string().min(1),
  head: z.string().min(1),
  totalFiles: z.number().int().min(1),
  totalLines: z.number().int().min(0),
  topBiggest: z.array(z.strictObject({ path: z.string(), lines: z.number().int().min(0) })),
  oversized: z.array(z.strictObject({ path: z.string(), lines: z.number().int().min(0) })),
});

const ExcludeOutputSchema = z.strictObject({
  excluded: z.array(z.string()),
  remainingFiles: z.number().int().min(0),
  totalLines: z.number().int().min(0),
  oversized: z.array(z.strictObject({ path: z.string(), lines: z.number().int().min(0) })),
  scopeReviewed: z.boolean(),
});

const makeFindingBody = (where: string) => ({
  sign: 1,
  kind: "proven" as const,
  risk: "low" as const,
  where,
  what: "Unused abstraction wrapper",
  replaceWith: "Inline direct call",
  removes: "20 lines",
  usersLose: "Nothing",
  proof: "Zero external callers",
  protectedBy: "Unit tests",
});

const makeHunterReport = (opts: {
  houseShape?: string;
  where: string;
  notReadInFull?: string[];
}): Record<string, unknown> => ({
  ...(opts.houseShape !== undefined ? { houseShape: opts.houseShape } : {}),
  weightMap: [
    {
      capability: "Core",
      files: opts.where,
      lines: 20,
      sharePct: 100,
      status: "finding",
      findingId: "#1",
    },
  ],
  findings: [{ id: "#1", ...makeFindingBody(opts.where) }],
  cleanup: [],
  alsoNoticed: [],
  leadsDropped: [],
  notesOnDesign: [],
  findersCouldntSee: [],
  notReadInFull: opts.notReadInFull ?? [],
});

const makeDesignReport = (where: string): Record<string, unknown> => ({
  houseShape: "Small layered service",
  weightMap: [
    {
      capability: "API",
      files: where,
      lines: 4500,
      sharePct: 50,
      status: "finding",
      findingId: "D1",
    },
  ],
  findings: [{ id: "D1", ...makeFindingBody(where) }],
  cleanup: [],
  alsoNoticed: [],
  leadsDropped: [],
});

const makeVerifyReport = (targetId: string): Record<string, unknown> => ({
  verdicts: [
    {
      target: targetId,
      verdict: "kept",
      why: "Confirmed unused in code",
    },
  ],
  alsoNoticedVerdicts: [],
  cleanupVerdicts: [],
  raisedFromDroppedLeads: [],
});

const makeAuditReport = (repo: string, head: string, where: string): Record<string, unknown> => ({
  tldr: "One unused wrapper found.",
  findings: [],
  needsFromYou: [{ item: "Remove unused wrapper", rec: "yes" }],
  weightMap: [
    {
      capability: "Core",
      lines: 20,
      sharePct: 100,
      status: "finding",
      findingId: "#1",
    },
  ],
  design: [],
  code: [{ id: "#1", ...makeFindingBody(where) }],
  cleanup: [],
  alsoNoticed: [],
  hunted: {
    repo,
    head,
    notReadInFull: [],
    leftOut: [],
    findersRun: [],
    skipped: [{ name: "knip", why: "--skip-finders" }],
  },
});

describe("slop-ctl e2e: small repo lifecycle", () => {
  it("runs init -> auto-all hunter -> verifier -> reporter -> idempotent relay", () => {
    const repo = makeTempGitRepo("small");
    writeLines(repo, "src/app.ts", 20);
    writeFile(repo, "CMakeLists.txt", "cmake_minimum_required(VERSION 3.20)\n");
    writeFile(repo, "requirements.txt", "pytest==8.0.0\n");
    writeFile(repo, "notes.txt", "plain text ignored\n");
    writeFile(repo, "vendor/dep.ts", "export const v = 1;\n");
    writeFile(repo, "generated/out.g.cs", "class Gen {}\n");
    writeFile(repo, "pnpm-lock.yaml", "lockfileVersion: 9\n");

    git(["add", "."], repo);
    git(["commit", "-q", "-m", "chore: initial commit"], repo);

    const initRes = runSlopCtl(["init", "--skip-finders"], repo);
    assert.equal(initRes.status, 0, initRes.stderr);
    const initOut = InitOutputSchema.parse(YAML.parse(initRes.stdout));
    assert.equal(initOut.root, repo);
    assert.equal(initOut.totalFiles, 3);
    assert.equal(initOut.oversized.length, 0);

    const scopeContent = fs.readFileSync(path.join(initOut.run, "scope.txt"), "utf8");
    assert.deepEqual(scopeContent.trim().split("\n"), [
      "CMakeLists.txt",
      "requirements.txt",
      "src/app.ts",
    ]);
    assert.equal(
      fs.readFileSync(path.join(initOut.run, "leads-knip.txt"), "utf8"),
      "skipped: --skip-finders\n",
    );
    assert.equal(
      fs.readFileSync(path.join(initOut.run, "leads-jscpd.txt"), "utf8"),
      "skipped: --skip-finders\n",
    );
    assert.match(fs.readFileSync(path.join(initOut.run, "churn.txt"), "utf8"), /src\/app\.ts/);

    const state = SlopStateSchema.parse(
      JSON.parse(fs.readFileSync(path.join(initOut.run, "state.json"), "utf8")),
    );
    assert.equal(state.skillDir, EXPECTED_DEFAULT_SKILL_DIR);

    // Step 1: auto-all -> spawns hunter for "all"
    const next1 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next1.status, 0, next1.stderr);
    const action1 = SlopActionSchema.parse(YAML.parse(next1.stdout));
    assert.equal(action1.action, "spawn");
    assert.equal(action1.subagents.length, 1);
    assert.equal(action1.subagents[0]?.role, "hunter");
    assert.equal(action1.subagents[0]?.yours, "all");

    const areasFile = AreasFileSchema.parse(
      YAML.parse(fs.readFileSync(path.join(initOut.run, "areas.yaml"), "utf8")),
    );
    assert.deepEqual(
      areasFile.areas.map((a) => a.name),
      ["all"],
    );

    // Validate hunter --single-area rejects missing houseShape, accepts with houseShape
    const hunterReportPath = path.join(initOut.run, "report-all.yaml");
    writeYaml(hunterReportPath, makeHunterReport({ where: "src/app.ts:1" }));
    const badSingle = runSlopCtl(["validate", "hunter", hunterReportPath, "--single-area"], repo);
    assert.equal(badSingle.status, 1);
    assert.match(badSingle.stderr, /houseShape/);

    writeYaml(
      hunterReportPath,
      makeHunterReport({ houseShape: "Tiny CLI repo", where: "src/app.ts:1" }),
    );
    const okSingle = runSlopCtl(["validate", "hunter", hunterReportPath, "--single-area"], repo);
    assert.equal(okSingle.status, 0, okSingle.stderr);
    assert.equal(okSingle.stdout.trim(), "OK");

    // Step 2: spawns verifier for report-all.yaml
    const next2 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next2.status, 0, next2.stderr);
    const action2 = SlopActionSchema.parse(YAML.parse(next2.stdout));
    assert.equal(action2.action, "spawn");
    assert.equal(action2.subagents[0]?.role, "verifier");
    assert.equal(action2.subagents[0]?.yours, "report-all.yaml");

    const verifyPath = path.join(initOut.run, "verify-all.yaml");
    writeYaml(verifyPath, makeVerifyReport("#1"));
    const okVerify = runSlopCtl(
      ["validate", "verifier", verifyPath, "--report", hunterReportPath],
      repo,
    );
    assert.equal(okVerify.status, 0, okVerify.stderr);
    assert.equal(okVerify.stdout.trim(), "OK");

    // Step 3: spawns reporter
    const next3 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next3.status, 0, next3.stderr);
    const action3 = SlopActionSchema.parse(YAML.parse(next3.stdout));
    assert.equal(action3.action, "spawn");
    assert.equal(action3.subagents[0]?.role, "reporter");

    const auditPath = path.join(initOut.run, "audit.yaml");
    writeYaml(auditPath, makeAuditReport(path.basename(repo), initOut.head, "src/app.ts:1"));
    const okAudit = runSlopCtl(["validate", "reporter", auditPath], repo);
    assert.equal(okAudit.status, 0, okAudit.stderr);
    assert.equal(okAudit.stdout.trim(), "OK");

    const rendered = runSlopCtl(["render", auditPath], repo);
    assert.equal(rendered.status, 0, rendered.stderr);
    assert.match(rendered.stdout, /^## TLDR\n/);

    // Step 4: renders report.md and emits relay
    const next4 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next4.status, 0, next4.stderr);
    const action4 = SlopActionSchema.parse(YAML.parse(next4.stdout));
    assert.equal(action4.action, "relay");
    assert.equal(action4.report, path.join(initOut.run, "report.md"));
    assert.equal(fs.readFileSync(action4.report, "utf8"), rendered.stdout);

    // Step 5: idempotent relay after done
    const next5 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next5.status, 0, next5.stderr);
    assert.deepEqual(SlopActionSchema.parse(YAML.parse(next5.stdout)), action4);
  });
});

describe("slop-ctl e2e: multi-area repo with review-scope, split, design-reader, and -rest", () => {
  it("handles oversized exclude, split validation, design-reader, automatic -rest, and full completion", () => {
    const repo = makeTempGitRepo("multi");
    // > 8,000 total lines across two modules + an oversized > 2,000-line data file
    writeLines(repo, "api/a.ts", 1500);
    writeLines(repo, "api/b.ts", 1500);
    writeLines(repo, "api/c.ts", 1500);
    writeLines(repo, "web/a.ts", 1500);
    writeLines(repo, "web/b.ts", 1500);
    writeLines(repo, "web/c.ts", 1500);
    writeLines(repo, "data/seed.json", 2100);

    git(["add", "."], repo);
    git(["commit", "-q", "-m", "chore: multi-area seed"], repo);

    const customSkill = path.join(repo, "custom-skill");
    const initRes = runSlopCtl(["init", "--skip-finders", "--skill", customSkill], repo);
    assert.equal(initRes.status, 0, initRes.stderr);
    const initOut = InitOutputSchema.parse(YAML.parse(initRes.stdout));
    assert.equal(initOut.oversized.length, 1);
    assert.equal(initOut.oversized[0]?.path, "data/seed.json");

    // Step 1: review-scope emitted because data/seed.json > 2,000 lines
    const next1 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next1.status, 0, next1.stderr);
    const action1 = SlopActionSchema.parse(YAML.parse(next1.stdout));
    assert.equal(action1.action, "review-scope");
    assert.equal(action1.oversized[0]?.path, "data/seed.json");

    // Exclude data/seed.json -> removes from scope, writes left-out.txt, marks scopeReviewed
    const exclRes = runSlopCtl(["exclude", initOut.run, "data/seed.json"], repo);
    assert.equal(exclRes.status, 0, exclRes.stderr);
    const exclOut = ExcludeOutputSchema.parse(YAML.parse(exclRes.stdout));
    assert.deepEqual(exclOut.excluded, ["data/seed.json"]);
    assert.equal(exclOut.remainingFiles, 6);
    assert.equal(exclOut.totalLines, 9000);
    assert.equal(exclOut.scopeReviewed, true);
    assert.equal(
      fs.readFileSync(path.join(initOut.run, "left-out.txt"), "utf8"),
      "data/seed.json\n",
    );

    // Step 2: split emitted because totalLines (9000) > 8000
    const next2 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next2.status, 0, next2.stderr);
    const action2 = SlopActionSchema.parse(YAML.parse(next2.stdout));
    assert.equal(action2.action, "split");
    assert.equal(action2.totalLines, 9000);
    assert.deepEqual(action2.errors, []);

    // Write invalid areas.yaml (missing web/c.ts) -> validate fails, next returns split with errors
    const areasPath = path.join(initOut.run, "areas.yaml");
    writeYaml(areasPath, {
      areas: [
        { name: "api", files: ["api/a.ts", "api/b.ts", "api/c.ts"] },
        { name: "web", files: ["web/a.ts", "web/b.ts"] },
      ],
    });
    const badAreas = runSlopCtl(["validate", "areas", areasPath], repo);
    assert.equal(badAreas.status, 1);
    assert.match(badAreas.stderr, /web\/c\.ts/);

    const next2b = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next2b.status, 0, next2b.stderr);
    const action2b = SlopActionSchema.parse(YAML.parse(next2b.stdout));
    assert.equal(action2b.action, "split");
    assert.ok(action2b.errors.length > 0);

    // Write valid areas.yaml -> validate passes
    writeYaml(areasPath, {
      areas: [
        { name: "api", files: ["api/a.ts", "api/b.ts", "api/c.ts"] },
        { name: "web", files: ["web/a.ts", "web/b.ts", "web/c.ts"] },
      ],
    });
    const okAreas = runSlopCtl(["validate", "areas", areasPath], repo);
    assert.equal(okAreas.status, 0, okAreas.stderr);
    assert.equal(okAreas.stdout.trim(), "OK");

    // Step 3: enriches areas.yaml and spawns design-reader
    const next3 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next3.status, 0, next3.stderr);
    const action3 = SlopActionSchema.parse(YAML.parse(next3.stdout));
    assert.equal(action3.action, "spawn");
    assert.equal(action3.subagents[0]?.role, "design-reader");
    assert.ok(action3.subagents[0]?.brief.includes(customSkill));

    const enrichedAreas = AreasFileSchema.parse(YAML.parse(fs.readFileSync(areasPath, "utf8")));
    assert.equal(enrichedAreas.root, repo);
    assert.equal(enrichedAreas.head, initOut.head);
    assert.equal(enrichedAreas.areas[0]?.lines, 4500);
    assert.equal(enrichedAreas.areas[1]?.lines, 4500);

    const designReportPath = path.join(initOut.run, "report-design.yaml");
    writeYaml(designReportPath, makeDesignReport("api/a.ts:1"));
    const okDesign = runSlopCtl(["validate", "design-reader", designReportPath], repo);
    assert.equal(okDesign.status, 0, okDesign.stderr);

    // Step 4: spawns parallel hunters for api and web
    const next4 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next4.status, 0, next4.stderr);
    const action4 = SlopActionSchema.parse(YAML.parse(next4.stdout));
    assert.equal(action4.action, "spawn");
    assert.equal(action4.parallel, true);
    assert.deepEqual(
      action4.subagents.map((s) => s.yours),
      ["api", "web"],
    );

    // api hunter leaves api/c.ts in notReadInFull -> triggers automatic api-rest
    writeYaml(
      path.join(initOut.run, "report-api.yaml"),
      makeHunterReport({ where: "api/a.ts:1", notReadInFull: ["api/c.ts"] }),
    );
    writeYaml(path.join(initOut.run, "report-web.yaml"), makeHunterReport({ where: "web/a.ts:1" }));

    // Step 5: appends api-rest to areas.yaml and spawns hunter for api-rest
    const next5 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next5.status, 0, next5.stderr);
    const action5 = SlopActionSchema.parse(YAML.parse(next5.stdout));
    assert.equal(action5.action, "spawn");
    assert.deepEqual(
      action5.subagents.map((s) => s.yours),
      ["api-rest"],
    );

    const areasWithRest = AreasFileSchema.parse(YAML.parse(fs.readFileSync(areasPath, "utf8")));
    const restArea = areasWithRest.areas.find((a) => a.name === "api-rest");
    assert.ok(restArea !== undefined);
    assert.deepEqual(restArea.files, ["api/c.ts"]);
    assert.equal(restArea.lines, 1500);

    writeYaml(
      path.join(initOut.run, "report-api-rest.yaml"),
      makeHunterReport({ where: "api/c.ts:1" }),
    );

    // Step 6: spawns verifiers for design, api, web, and api-rest
    const next6 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next6.status, 0, next6.stderr);
    const action6 = SlopActionSchema.parse(YAML.parse(next6.stdout));
    assert.equal(action6.action, "spawn");
    assert.equal(action6.parallel, true);
    assert.deepEqual(
      action6.subagents.map((s) => s.yours),
      ["report-design.yaml", "report-api.yaml", "report-web.yaml", "report-api-rest.yaml"],
    );

    writeYaml(path.join(initOut.run, "verify-design.yaml"), makeVerifyReport("D1"));
    const okDesignVerify = runSlopCtl(
      [
        "validate",
        "verifier",
        path.join(initOut.run, "verify-design.yaml"),
        "--report",
        designReportPath,
      ],
      repo,
    );
    assert.equal(okDesignVerify.status, 0, okDesignVerify.stderr);
    assert.equal(okDesignVerify.stdout.trim(), "OK");
    writeYaml(path.join(initOut.run, "verify-api.yaml"), makeVerifyReport("#1"));
    writeYaml(path.join(initOut.run, "verify-web.yaml"), makeVerifyReport("#1"));
    writeYaml(path.join(initOut.run, "verify-api-rest.yaml"), makeVerifyReport("#1"));

    // Step 7: spawns reporter
    const next7 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next7.status, 0, next7.stderr);
    const action7 = SlopActionSchema.parse(YAML.parse(next7.stdout));
    assert.equal(action7.action, "spawn");
    assert.equal(action7.subagents[0]?.role, "reporter");

    writeYaml(
      path.join(initOut.run, "audit.yaml"),
      makeAuditReport(path.basename(repo), initOut.head, "api/a.ts:1"),
    );

    // Step 8: relay
    const next8 = runSlopCtl(["next", initOut.run], repo);
    assert.equal(next8.status, 0, next8.stderr);
    const action8 = SlopActionSchema.parse(YAML.parse(next8.stdout));
    assert.equal(action8.action, "relay");
    assert.equal(fs.existsSync(action8.report), true);
  });
});

describe("slop-ctl e2e: negative cases and retries", () => {
  it("stops cleanly on a repository with no scannable files", () => {
    const repo = makeTempGitRepo("empty");
    writeFile(repo, "notes.txt", "only ignored txt\n");
    git(["add", "notes.txt"], repo);
    git(["commit", "-q", "-m", "chore: ignored only"], repo);

    const res = runSlopCtl(["init", "--skip-finders"], repo);
    assert.equal(res.status, 0, res.stderr);
    const action = SlopActionSchema.parse(YAML.parse(res.stdout));
    assert.equal(action.action, "stop");
    assert.equal(action.reason, "No scannable files found in repository.");
  });

  it("rejects folded block scalars (> and >-) and missing verifier verdicts", () => {
    const repo = makeTempGitRepo("negatives");
    writeLines(repo, "src/index.ts", 10);
    git(["add", "."], repo);
    git(["commit", "-q", "-m", "chore: init"], repo);

    const foldedGt = path.join(repo, "folded-gt.yaml");
    fs.writeFileSync(
      foldedGt,
      [
        "houseShape: >",
        "  folded scalar not allowed",
        "weightMap: []",
        "findings: []",
        "cleanup: []",
        "alsoNoticed: []",
        "leadsDropped: []",
        "notesOnDesign: []",
        "findersCouldntSee: []",
        "notReadInFull: []",
        "",
      ].join("\n"),
      "utf8",
    );
    const resGt = runSlopCtl(["validate", "hunter", foldedGt], repo);
    assert.equal(resGt.status, 1);
    assert.match(resGt.stderr, /Folded block scalars/);

    const foldedStrip = path.join(repo, "folded-strip.yaml");
    fs.writeFileSync(
      foldedStrip,
      [
        "houseShape: >-",
        "  folded strip scalar not allowed",
        "weightMap: []",
        "findings: []",
        "cleanup: []",
        "alsoNoticed: []",
        "leadsDropped: []",
        "",
      ].join("\n"),
      "utf8",
    );
    const resStrip = runSlopCtl(["validate", "design-reader", foldedStrip], repo);
    assert.equal(resStrip.status, 1);
    assert.match(resStrip.stderr, /Folded block scalars/);

    // Missing verifier verdict -> exit 1; missing --report -> exit 2
    const reportPath = path.join(repo, "report-all.yaml");
    const verifyPath = path.join(repo, "verify-all.yaml");
    writeYaml(reportPath, makeHunterReport({ houseShape: "Small", where: "src/index.ts:1" }));
    writeYaml(verifyPath, {
      verdicts: [],
      alsoNoticedVerdicts: [],
      cleanupVerdicts: [],
      raisedFromDroppedLeads: [],
    });

    const missingVerdict = runSlopCtl(
      ["validate", "verifier", verifyPath, "--report", reportPath],
      repo,
    );
    assert.equal(missingVerdict.status, 1);
    assert.match(missingVerdict.stderr, /missing verdict for finding "#1"/);

    const noReportFlag = runSlopCtl(["validate", "verifier", verifyPath], repo);
    assert.equal(noReportFlag.status, 2);
    assert.match(noReportFlag.stderr, /--report/);

    const badRole = runSlopCtl(["validate", "unknown-role", verifyPath], repo);
    assert.equal(badRole.status, 2);

    const missingAreasScope = runSlopCtl(
      ["validate", "areas", path.join(repo, "areas.yaml")],
      repo,
    );
    assert.equal(missingAreasScope.status, 2);

    // Invalid reporter and render exit 1; missing render file exits 2
    const badAuditPath = path.join(repo, "bad-audit.yaml");
    writeYaml(badAuditPath, { tldr: "" });
    const badReporter = runSlopCtl(["validate", "reporter", badAuditPath], repo);
    assert.equal(badReporter.status, 1);
    const badRender = runSlopCtl(["render", badAuditPath], repo);
    assert.equal(badRender.status, 1);
    const missingRender = runSlopCtl(["render", path.join(repo, "does-not-exist.yaml")], repo);
    assert.equal(missingRender.status, 2);
  });

  it("retries once on missed hunter and stops on second missed reporter", () => {
    const repo = makeTempGitRepo("retries");
    writeLines(repo, "src/index.ts", 10);
    git(["add", "."], repo);
    git(["commit", "-q", "-m", "chore: init"], repo);

    const initRes = runSlopCtl(["init", "--skip-finders"], repo);
    assert.equal(initRes.status, 0, initRes.stderr);
    const { run: runDir } = InitOutputSchema.parse(YAML.parse(initRes.stdout));

    // Hunter attempt 1
    const h1 = SlopActionSchema.parse(YAML.parse(runSlopCtl(["next", runDir], repo).stdout));
    assert.equal(h1.action, "spawn");
    assert.equal(h1.subagents[0]?.role, "hunter");

    // Hunter missed -> attempt 2
    const h2 = SlopActionSchema.parse(YAML.parse(runSlopCtl(["next", runDir], repo).stdout));
    assert.equal(h2.action, "spawn");
    assert.equal(h2.subagents[0]?.role, "hunter");

    // Hunter missed twice -> moves on to reporter attempt 1 (no valid reports to verify)
    const r1 = SlopActionSchema.parse(YAML.parse(runSlopCtl(["next", runDir], repo).stdout));
    assert.equal(r1.action, "spawn");
    assert.equal(r1.subagents[0]?.role, "reporter");

    // Reporter missed -> attempt 2
    const r2 = SlopActionSchema.parse(YAML.parse(runSlopCtl(["next", runDir], repo).stdout));
    assert.equal(r2.action, "spawn");
    assert.equal(r2.subagents[0]?.role, "reporter");

    // Reporter missed twice -> stop
    const stopped = SlopActionSchema.parse(YAML.parse(runSlopCtl(["next", runDir], repo).stdout));
    assert.equal(stopped.action, "stop");
  });

  it("supports exclude --done when oversized code files remain intentionally in scope", () => {
    const repo = makeTempGitRepo("exclude-done");
    writeLines(repo, "src/big-code.ts", 2100);
    writeLines(repo, "data/extra.json", 2050);
    git(["add", "."], repo);
    git(["commit", "-q", "-m", "chore: big code"], repo);

    const initRes = runSlopCtl(["init", "--skip-finders"], repo);
    assert.equal(initRes.status, 0, initRes.stderr);
    const { run: runDir } = InitOutputSchema.parse(YAML.parse(initRes.stdout));

    const first = SlopActionSchema.parse(YAML.parse(runSlopCtl(["next", runDir], repo).stdout));
    assert.equal(first.action, "review-scope");

    // Excluding only one of two oversized files without --done keeps scopeReviewed false
    const partialRes = runSlopCtl(["exclude", runDir, "data/extra.json"], repo);
    assert.equal(partialRes.status, 0, partialRes.stderr);
    const partialOut = ExcludeOutputSchema.parse(YAML.parse(partialRes.stdout));
    assert.equal(partialOut.scopeReviewed, false);
    assert.equal(partialOut.oversized.length, 1);

    const doneRes = runSlopCtl(["exclude", runDir, "--done"], repo);
    assert.equal(doneRes.status, 0, doneRes.stderr);
    const doneOut = ExcludeOutputSchema.parse(YAML.parse(doneRes.stdout));
    assert.equal(doneOut.scopeReviewed, true);
    assert.equal(doneOut.oversized.length, 1);

    // Now next advances directly to single-area hunter
    const second = SlopActionSchema.parse(YAML.parse(runSlopCtl(["next", runDir], repo).stdout));
    assert.equal(second.action, "spawn");
    assert.equal(second.subagents[0]?.role, "hunter");
    assert.equal(second.subagents[0]?.yours, "all");
  });
});

describe("slop-ctl e2e: plans ignore, mechanical finders, error exits, and run dir collisions", () => {
  it("appends .plans/ to info/exclude when unignored and keeps .plans/ out of scope.txt", () => {
    const repo = makeTempGitRepo("plans-ignore");
    writeLines(repo, "src/app.ts", 10);
    git(["add", "src/app.ts"], repo);
    git(["commit", "-q", "-m", "chore: initial"], repo);

    // Pre-existing untracked file under .plans/ must be ignored once ensurePlansIgnored runs
    writeLines(repo, ".plans/scratch-note.ts", 5);

    const beforeCheck = spawnSync("git", ["-C", repo, "check-ignore", "-q", ".plans/"], {
      encoding: "utf8",
    });
    assert.notEqual(beforeCheck.status, 0);

    const init1 = runSlopCtl(["init", "--skip-finders"], repo);
    assert.equal(init1.status, 0, init1.stderr);
    const out1 = InitOutputSchema.parse(YAML.parse(init1.stdout));

    const afterCheck = spawnSync("git", ["-C", repo, "check-ignore", "-q", ".plans/"], {
      encoding: "utf8",
    });
    assert.equal(afterCheck.status, 0);

    const excludePath = path.join(repo, ".git", "info", "exclude");
    const excludeContent1 = fs.readFileSync(excludePath, "utf8");
    assert.match(excludeContent1, /(^|\n)\.plans\/\n/);

    const scopeFiles = fs.readFileSync(path.join(out1.run, "scope.txt"), "utf8").trim().split("\n");
    assert.deepEqual(scopeFiles, ["src/app.ts"]);

    // Running init again must not duplicate .plans/ in info/exclude
    const init2 = runSlopCtl(["init", "--skip-finders"], repo);
    assert.equal(init2.status, 0, init2.stderr);
    const excludeContent2 = fs.readFileSync(excludePath, "utf8");
    assert.equal(excludeContent2, excludeContent1);
  });

  it("runs knip (Nuxt skip, local bin, npx fallback), jscpd, and --lint-cmd", () => {
    // 1. Nuxt project without .nuxt -> knip skipped; jscpd + --lint-cmd run
    const nuxtRepo = makeTempGitRepo("nuxt-finders");
    writeFile(nuxtRepo, "package.json", '{"name":"nuxt-app"}\n');
    writeFile(nuxtRepo, "nuxt.config.ts", "export default {};\n");
    writeLines(nuxtRepo, "src/app.ts", 10);
    git(["add", "."], nuxtRepo);
    git(["commit", "-q", "-m", "chore: nuxt"], nuxtRepo);

    const fakeBin = makeFakeBinDir("js-finders", {
      npx: 'printf "FAKE_NPX %s\\n" "$*"',
    });

    const nuxtInit = runSlopCtl(
      ["init", "--lint-cmd", "printf 'lint-out\\n' && printf 'lint-err\\n' >&2"],
      nuxtRepo,
      envWithBin(fakeBin),
    );
    assert.equal(nuxtInit.status, 0, nuxtInit.stderr);
    const nuxtOut = InitOutputSchema.parse(YAML.parse(nuxtInit.stdout));

    assert.equal(
      fs.readFileSync(path.join(nuxtOut.run, "leads-knip.txt"), "utf8"),
      "skipped: Nuxt project without .nuxt directory\n",
    );
    const jscpdConfigSchema = z.strictObject({ path: z.array(z.string()) });
    const jscpdConfig = jscpdConfigSchema.parse(
      JSON.parse(fs.readFileSync(path.join(nuxtOut.run, "jscpd.json"), "utf8")),
    );
    assert.deepEqual(jscpdConfig.path, [
      path.join(nuxtRepo, "nuxt.config.ts"),
      path.join(nuxtRepo, "package.json"),
      path.join(nuxtRepo, "src/app.ts"),
    ]);
    assert.match(
      fs.readFileSync(path.join(nuxtOut.run, "leads-jscpd.txt"), "utf8"),
      /FAKE_NPX --yes jscpd@5 --config .*jscpd\.json --reporters console/,
    );
    assert.equal(
      fs.readFileSync(path.join(nuxtOut.run, "leads-lint.txt"), "utf8"),
      "lint-out\nlint-err\n",
    );

    // 2. Plain package.json without local knip -> npx fallback
    const npxRepo = makeTempGitRepo("npx-knip");
    writeFile(npxRepo, "package.json", '{"name":"plain-app"}\n');
    writeLines(npxRepo, "src/app.ts", 10);
    git(["add", "."], npxRepo);
    git(["commit", "-q", "-m", "chore: plain"], npxRepo);

    const npxInit = runSlopCtl(["init"], npxRepo, envWithBin(fakeBin));
    assert.equal(npxInit.status, 0, npxInit.stderr);
    const npxOut = InitOutputSchema.parse(YAML.parse(npxInit.stdout));
    assert.match(
      fs.readFileSync(path.join(npxOut.run, "leads-knip.txt"), "utf8"),
      /FAKE_NPX --yes knip@5/,
    );

    // 3. Local node_modules/.bin/knip -> invoked directly instead of npx
    writeFile(npxRepo, ".gitignore", "node_modules/\n");
    const localKnipPath = path.join(npxRepo, "node_modules", ".bin", "knip");
    fs.mkdirSync(path.dirname(localKnipPath), { recursive: true });
    fs.writeFileSync(localKnipPath, '#!/bin/sh\necho "LOCAL_KNIP_UNUSED src/app.ts"\n', {
      mode: 0o755,
    });

    const localInit = runSlopCtl(["init"], npxRepo, envWithBin(fakeBin));
    assert.equal(localInit.status, 0, localInit.stderr);
    const localOut = InitOutputSchema.parse(YAML.parse(localInit.stdout));
    assert.equal(
      fs.readFileSync(path.join(localOut.run, "leads-knip.txt"), "utf8"),
      "LOCAL_KNIP_UNUSED src/app.ts\n",
    );
  });

  it("defers jscpd when oversized files exist and excludes removed files from jscpd.json and leads-jscpd.txt", () => {
    const repo = makeTempGitRepo("jscpd-exclude");
    writeLines(repo, "src/app.ts", 20);
    writeLines(repo, "data/seed.json", 2100);
    git(["add", "."], repo);
    git(["commit", "-q", "-m", "chore: seed"], repo);

    const fakeBin = makeFakeBinDir("jscpd-exclude", {
      npx: [
        'cfg=""',
        'prev=""',
        'for arg in "$@"; do',
        '  if [ "$prev" = "--config" ]; then cfg="$arg"; fi',
        '  prev="$arg"',
        "done",
        'printf "FAKE_JSCPD %s\\n" "$(cat "$cfg")"',
      ].join("\n"),
    });

    const initRes = runSlopCtl(["init"], repo, envWithBin(fakeBin));
    assert.equal(initRes.status, 0, initRes.stderr);
    const initOut = InitOutputSchema.parse(YAML.parse(initRes.stdout));
    assert.equal(initOut.oversized.length, 1);
    assert.equal(fs.existsSync(path.join(initOut.run, "jscpd.json")), false);
    assert.equal(fs.existsSync(path.join(initOut.run, "leads-jscpd.txt")), false);

    const exclRes = runSlopCtl(
      ["exclude", initOut.run, "data/seed.json"],
      repo,
      envWithBin(fakeBin),
    );
    assert.equal(exclRes.status, 0, exclRes.stderr);
    const exclOut = ExcludeOutputSchema.parse(YAML.parse(exclRes.stdout));
    assert.equal(exclOut.scopeReviewed, true);

    const jscpdConfigSchema = z.strictObject({ path: z.array(z.string()) });
    const jscpdConfig = jscpdConfigSchema.parse(
      JSON.parse(fs.readFileSync(path.join(initOut.run, "jscpd.json"), "utf8")),
    );
    assert.deepEqual(jscpdConfig.path, [path.join(repo, "src/app.ts")]);
    const leadsJscpd = fs.readFileSync(path.join(initOut.run, "leads-jscpd.txt"), "utf8");
    assert.match(leadsJscpd, /src\/app\.ts/);
    assert.doesNotMatch(leadsJscpd, /data\/seed\.json/);
  });

  it("runs .NET finders (unrestored skip, restored multi-solution dotnet format and jb inspectcode, jb missing and non-zero exit)", () => {
    const repo = makeTempGitRepo("dotnet-finders");
    writeFile(repo, "App.sln", "Microsoft Visual Studio Solution File\n");
    writeFile(repo, "Tools.slnx", "<Solution />\n");
    writeFile(repo, "Program.cs", "class Program { static void Main() {} }\n");
    git(["add", "."], repo);
    git(["commit", "-q", "-m", "chore: dotnet"], repo);

    const fakeBinWithJb = makeFakeBinDir("dotnet-with-jb", {
      npx: 'printf "FAKE_NPX %s\\n" "$*"',
      dotnet: [
        'echo "Formatting code files..."',
        "echo \"$3: Program.cs(4,10): info IDE0051: Private member 'Unused' is unused\"",
        'echo "$3: Program.cs(8,10): info IDE0060: Remove unused parameter"',
      ].join("\n"),
      jb: [
        'if [ "$1" = "--version" ]; then echo "jb 2026.1"; exit 0; fi',
        'for arg in "$@"; do',
        '  case "$arg" in',
        '    -o=*) printf "INSPECTCODE_REPORT %s\\n" "$2" > "${arg#-o=}" ;;',
        "  esac",
        "done",
      ].join("\n"),
    });

    // 1. Unrestored solution (no obj/project.assets.json) -> skip marker
    const unrestoredRes = runSlopCtl(["init"], repo, envWithBin(fakeBinWithJb));
    assert.equal(unrestoredRes.status, 0, unrestoredRes.stderr);
    const unrestoredOut = InitOutputSchema.parse(YAML.parse(unrestoredRes.stdout));
    assert.equal(
      fs.readFileSync(path.join(unrestoredOut.run, "leads-dotnet-format.txt"), "utf8"),
      "skipped: no obj/project.assets.json (restore required)\n",
    );
    assert.equal(fs.existsSync(path.join(unrestoredOut.run, "leads-inspectcode.txt")), false);

    // 2. Restored multi-solution repo with jb installed -> filtered IDE0051/IDE0060 + combined inspectcode report
    writeFile(repo, "obj/project.assets.json", "{}\n");
    const restoredRes = runSlopCtl(["init"], repo, envWithBin(fakeBinWithJb));
    assert.equal(restoredRes.status, 0, restoredRes.stderr);
    const restoredOut = InitOutputSchema.parse(YAML.parse(restoredRes.stdout));

    const dotnetFormatOut = fs.readFileSync(
      path.join(restoredOut.run, "leads-dotnet-format.txt"),
      "utf8",
    );
    assert.equal(
      dotnetFormatOut,
      [
        "App.sln: Program.cs(4,10): info IDE0051: Private member 'Unused' is unused",
        "App.sln: Program.cs(8,10): info IDE0060: Remove unused parameter",
        "Tools.slnx: Program.cs(4,10): info IDE0051: Private member 'Unused' is unused",
        "Tools.slnx: Program.cs(8,10): info IDE0060: Remove unused parameter",
        "",
      ].join("\n"),
    );
    assert.equal(
      fs.readFileSync(path.join(restoredOut.run, "leads-inspectcode.txt"), "utf8"),
      "INSPECTCODE_REPORT App.sln\nINSPECTCODE_REPORT Tools.slnx\n",
    );

    // 3. Restored solution with jb unavailable -> skipped marker
    const fakeBinNoJb = makeFakeBinDir("dotnet-no-jb", {
      npx: 'printf "FAKE_NPX %s\\n" "$*"',
      dotnet: 'echo "Program.cs(1,1): info IDE0052: Unread field"',
      jb: "exit 1",
    });
    const noJbRes = runSlopCtl(["init"], repo, envWithBin(fakeBinNoJb));
    assert.equal(noJbRes.status, 0, noJbRes.stderr);
    const noJbOut = InitOutputSchema.parse(YAML.parse(noJbRes.stdout));
    assert.equal(
      fs.readFileSync(path.join(noJbOut.run, "leads-inspectcode.txt"), "utf8"),
      "skipped: jb not installed\n",
    );

    // 4. Restored solutions where jb inspectcode exits non-zero for all solutions -> skipped lines
    const fakeBinFailJb = makeFakeBinDir("dotnet-fail-jb", {
      npx: 'printf "FAKE_NPX %s\\n" "$*"',
      dotnet: 'echo "Program.cs(1,1): info IDE0052: Unread field"',
      jb: [
        'if [ "$1" = "--version" ]; then echo "jb 2026.1"; exit 0; fi',
        'echo "license check failed" >&2',
        "exit 2",
      ].join("\n"),
    });
    const failJbRes = runSlopCtl(["init"], repo, envWithBin(fakeBinFailJb));
    assert.equal(failJbRes.status, 0, failJbRes.stderr);
    const failJbOut = InitOutputSchema.parse(YAML.parse(failJbRes.stdout));
    assert.equal(
      fs.readFileSync(path.join(failJbOut.run, "leads-inspectcode.txt"), "utf8"),
      [
        "skipped: App.sln: jb inspectcode exited 2: license check failed",
        "skipped: Tools.slnx: jb inspectcode exited 2: license check failed",
        "",
      ].join("\n"),
    );

    // 5. Partial failure: one solution writes output, another exits non-zero without output
    const fakeBinPartialJb = makeFakeBinDir("dotnet-partial-jb", {
      npx: 'printf "FAKE_NPX %s\\n" "$*"',
      dotnet: 'echo "Program.cs(1,1): info IDE0052: Unread field"',
      jb: [
        'if [ "$1" = "--version" ]; then echo "jb 2026.1"; exit 0; fi',
        'if [ "$2" = "Tools.slnx" ]; then echo "solution load failed" >&2; exit 2; fi',
        'for arg in "$@"; do',
        '  case "$arg" in',
        '    -o=*) printf "INSPECTCODE_REPORT %s\\n" "$2" > "${arg#-o=}" ;;',
        "  esac",
        "done",
      ].join("\n"),
    });
    const partialJbRes = runSlopCtl(["init"], repo, envWithBin(fakeBinPartialJb));
    assert.equal(partialJbRes.status, 0, partialJbRes.stderr);
    const partialJbOut = InitOutputSchema.parse(YAML.parse(partialJbRes.stdout));
    assert.equal(
      fs.readFileSync(path.join(partialJbOut.run, "leads-inspectcode.txt"), "utf8"),
      [
        "INSPECTCODE_REPORT App.sln",
        "skipped (Tools.slnx): jb inspectcode exited 2: solution load failed",
        "",
      ].join("\n"),
    );
  });

  it("exits 2 for init outside a git repo and exclude or next on a missing run directory", () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), "slop-ctl-nongit-"));
    tmpDirs.push(nonGitDir);

    const initErr = runSlopCtl(["init", "--skip-finders"], nonGitDir);
    assert.equal(initErr.status, 2);
    assert.ok(initErr.stderr.trim().length > 0);

    const repo = makeTempGitRepo("missing-run");
    writeLines(repo, "src/index.ts", 5);
    git(["add", "."], repo);
    git(["commit", "-q", "-m", "chore: init"], repo);

    const missingRun = path.join(repo, "does-not-exist-run");
    const excludeErr = runSlopCtl(["exclude", missingRun, "src/index.ts"], repo);
    assert.equal(excludeErr.status, 2);
    assert.ok(excludeErr.stderr.trim().length > 0);

    const nextErr = runSlopCtl(["next", missingRun], repo);
    assert.equal(nextErr.status, 2);
    assert.ok(nextErr.stderr.trim().length > 0);
  });

  it("retries with a numeric suffix on EEXIST for same-second createRunDir collisions", () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "slop-ctl-rundir-"));
    tmpDirs.push(baseDir);

    const fixedDate = new Date(2026, 0, 2, 3, 4, 5);
    const first = createRunDir(baseDir, fixedDate);
    const second = createRunDir(baseDir, fixedDate);
    const third = createRunDir(baseDir, fixedDate);

    assert.equal(path.basename(first), "slop-hunt-20260102-030405");
    assert.equal(path.basename(second), "slop-hunt-20260102-030405-1");
    assert.equal(path.basename(third), "slop-hunt-20260102-030405-2");
    assert.equal(fs.existsSync(first), true);
    assert.equal(fs.existsSync(second), true);
    assert.equal(fs.existsSync(third), true);
  });
});
