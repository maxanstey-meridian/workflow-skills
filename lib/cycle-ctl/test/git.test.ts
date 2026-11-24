import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { commitPaths, getDiffStat } from "../src/git.ts";

const tmpDirs: string[] = [];

const runGit = (cwd: string, args: string[]): string => {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(res.status, 0, `git ${args.join(" ")} failed: ${res.stderr}`);
  return res.stdout;
};

const makeRepo = (prefix: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cycle-ctl-git-${prefix}-`));
  tmpDirs.push(dir);
  runGit(dir, ["init", "-q"]);
  runGit(dir, ["config", "user.email", "test@example.com"]);
  runGit(dir, ["config", "user.name", "Test User"]);
  fs.writeFileSync(path.join(dir, "README.md"), "# Demo\n", "utf8");
  runGit(dir, ["add", "README.md"]);
  runGit(dir, ["commit", "-q", "-m", "chore: initial commit"]);
  return dir;
};

after(() => {
  for (const dir of tmpDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("commitPaths", () => {
  it("commits git rm --cached removals for ignored files while keeping them on disk", () => {
    const dir = makeRepo("cached-ignored");
    fs.mkdirSync(path.join(dir, "run-state"), { recursive: true });
    fs.writeFileSync(path.join(dir, "run-state/a.json"), '{"ok":true}\n', "utf8");
    fs.writeFileSync(path.join(dir, "run-state/b.json"), '{"ok":true}\n', "utf8");
    runGit(dir, ["add", "run-state/a.json", "run-state/b.json"]);
    runGit(dir, ["commit", "-q", "-m", "chore: track run-state"]);

    fs.writeFileSync(path.join(dir, ".gitignore"), "run-state/\n", "utf8");
    runGit(dir, ["add", ".gitignore"]);
    runGit(dir, ["commit", "-q", "-m", "chore: ignore run-state"]);

    runGit(dir, ["rm", "--cached", "run-state/a.json", "run-state/b.json"]);

    const listFile = path.join(dir, ".git", "list.txt");
    const msgFile = path.join(dir, ".git", "msg.txt");
    const paths = ["run-state/a.json", "run-state/b.json"];
    fs.writeFileSync(listFile, `${paths.join("\n")}\n`, "utf8");
    fs.writeFileSync(msgFile, "chore: untrack run-state\n", "utf8");

    const stat = getDiffStat(dir, paths);
    assert.equal(stat.ok, true);
    if (stat.ok) {
      assert.match(stat.stat, /run-state\/a\.json/);
      assert.match(stat.stat, /run-state\/b\.json/);
    }

    const res = commitPaths(dir, listFile, msgFile, paths);
    assert.equal(res.ok, true, res.ok ? "" : res.error);

    assert.equal(fs.existsSync(path.join(dir, "run-state/a.json")), true);
    assert.equal(fs.existsSync(path.join(dir, "run-state/b.json")), true);
    assert.equal(runGit(dir, ["status", "--short"]), "");

    const headFiles = runGit(dir, ["ls-tree", "-r", "--name-only", "HEAD"]);
    assert.doesNotMatch(headFiles, /run-state\/a\.json/);
    assert.doesNotMatch(headFiles, /run-state\/b\.json/);
  });

  it("preserves git rm --cached removals for non-ignored files across getDiffStat and commitPaths", () => {
    const dir = makeRepo("cached-unignored");
    fs.writeFileSync(path.join(dir, "local.env"), "SECRET=1\n", "utf8");
    runGit(dir, ["add", "local.env"]);
    runGit(dir, ["commit", "-q", "-m", "chore: track local.env"]);

    runGit(dir, ["rm", "--cached", "local.env"]);

    const listFile = path.join(dir, ".git", "list.txt");
    const msgFile = path.join(dir, ".git", "msg.txt");
    fs.writeFileSync(listFile, "local.env\n", "utf8");
    fs.writeFileSync(msgFile, "chore: untrack local.env\n", "utf8");

    const stat = getDiffStat(dir, ["local.env"]);
    assert.equal(stat.ok, true);

    const res = commitPaths(dir, listFile, msgFile, ["local.env"]);
    assert.equal(res.ok, true, res.ok ? "" : res.error);

    assert.equal(fs.existsSync(path.join(dir, "local.env")), true);
    assert.equal(runGit(dir, ["status", "--short"]).trim(), "?? local.env");
    assert.doesNotMatch(runGit(dir, ["ls-tree", "-r", "--name-only", "HEAD"]), /local\.env/);
  });

  it("commits mixed cached removals, modifications, additions, and disk deletions without touching other staged files", () => {
    const dir = makeRepo("cached-mixed");
    fs.writeFileSync(path.join(dir, "cached.txt"), "keep on disk\n", "utf8");
    fs.writeFileSync(path.join(dir, "modified.txt"), "before\n", "utf8");
    fs.writeFileSync(path.join(dir, "deleted.txt"), "gone\n", "utf8");
    fs.writeFileSync(path.join(dir, "other.txt"), "other-before\n", "utf8");
    runGit(dir, ["add", "cached.txt", "modified.txt", "deleted.txt", "other.txt"]);
    runGit(dir, ["commit", "-q", "-m", "chore: seed files"]);

    // Another session stages a change to other.txt outside our commit list.
    fs.writeFileSync(path.join(dir, "other.txt"), "other-after\n", "utf8");
    runGit(dir, ["add", "other.txt"]);

    // Our commit list has a cached removal, a modification, a new file, and a disk deletion.
    runGit(dir, ["rm", "--cached", "cached.txt"]);
    fs.writeFileSync(path.join(dir, ".gitignore"), "cached.txt\n", "utf8");
    fs.writeFileSync(path.join(dir, "modified.txt"), "after\n", "utf8");
    fs.writeFileSync(path.join(dir, "added.txt"), "brand new\n", "utf8");
    fs.unlinkSync(path.join(dir, "deleted.txt"));

    const paths = [".gitignore", "added.txt", "cached.txt", "deleted.txt", "modified.txt"];
    const listFile = path.join(dir, ".git", "list.txt");
    const msgFile = path.join(dir, ".git", "msg.txt");
    fs.writeFileSync(listFile, `${paths.join("\n")}\n`, "utf8");
    fs.writeFileSync(msgFile, "chore: mixed commit\n", "utf8");

    const res = commitPaths(dir, listFile, msgFile, paths);
    assert.equal(res.ok, true, res.ok ? "" : res.error);

    // cached.txt stays on disk, removed from HEAD.
    assert.equal(fs.existsSync(path.join(dir, "cached.txt")), true);
    const headFiles = runGit(dir, ["ls-tree", "-r", "--name-only", "HEAD"]);
    assert.doesNotMatch(headFiles, /cached\.txt/);
    assert.doesNotMatch(headFiles, /deleted\.txt/);
    assert.match(headFiles, /added\.txt/);
    assert.equal(runGit(dir, ["show", "HEAD:modified.txt"]), "after\n");

    // other.txt was NOT committed and remains staged in the real index.
    assert.equal(runGit(dir, ["show", "HEAD:other.txt"]), "other-before\n");
    assert.equal(runGit(dir, ["status", "--short"]).trim(), "M  other.txt");
  });
});
