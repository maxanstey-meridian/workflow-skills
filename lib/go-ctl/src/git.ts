import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const runGit = (
  args: ReadonlyArray<string>,
  cwd?: string,
): { ok: true; stdout: string } | { ok: false; status: number | null; stderr: string } => {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (res.error !== undefined) {
    return { ok: false, status: null, stderr: res.error.message };
  }
  if (res.status !== 0) {
    return {
      ok: false,
      status: res.status,
      stderr: res.stderr.trim() || `git ${args.join(" ")} exited ${String(res.status)}`,
    };
  }
  return { ok: true, stdout: res.stdout };
};

export const resolveMainDir = (
  cwd: string,
): { ok: true; mainDir: string } | { ok: false; error: string } => {
  const res = runGit(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd);
  if (!res.ok) {
    return { ok: false, error: `Failed to resolve git main directory: ${res.stderr}` };
  }
  const commonDir = res.stdout.trim();
  if (commonDir.length === 0) {
    return { ok: false, error: "git rev-parse --git-common-dir returned empty output" };
  }
  return { ok: true, mainDir: path.dirname(commonDir) };
};

export const ensurePlansIgnored = (
  mainDir: string,
): { ok: true } | { ok: false; error: string } => {
  const check = runGit(["-C", mainDir, "check-ignore", "-q", ".plans/"]);
  if (check.ok) {
    return { ok: true };
  }

  const excludePathRes = runGit([
    "-C",
    mainDir,
    "rev-parse",
    "--path-format=absolute",
    "--git-path",
    "info/exclude",
  ]);
  if (!excludePathRes.ok) {
    return { ok: false, error: `Failed to locate git info/exclude: ${excludePathRes.stderr}` };
  }

  const excludePath = excludePathRes.stdout.trim();
  try {
    fs.mkdirSync(path.dirname(excludePath), { recursive: true });
    let existing = "";
    if (fs.existsSync(excludePath)) {
      existing = fs.readFileSync(excludePath, "utf8");
    }
    const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
    fs.appendFileSync(excludePath, `${prefix}.plans/\n`, "utf8");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to update ${excludePath}: ${message}` };
  }
};

export const captureGitStatus = (
  mainDir: string,
): { ok: true; status: string } | { ok: false; error: string } => {
  const res = runGit(["-C", mainDir, "status", "--short", "--untracked-files=all"]);
  if (!res.ok) {
    return { ok: false, error: `Failed to capture git status: ${res.stderr}` };
  }
  return { ok: true, status: res.stdout };
};
