import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type GitResult = { ok: true; stdout: string } | { ok: false; error: string };

const runGit = (
  args: string[],
  opts: { cwd: string; env?: NodeJS.ProcessEnv; input?: string },
): GitResult => {
  const res = spawnSync("git", args, {
    cwd: opts.cwd,
    env: opts.env,
    input: opts.input,
    encoding: "utf8",
  });
  if (res.error !== undefined) {
    return { ok: false, error: res.error.message };
  }
  if (res.status !== 0) {
    const stderr = res.stderr.trim();
    const stdout = res.stdout.trim();
    const detail = stderr.length > 0 ? stderr : stdout;
    return {
      ok: false,
      error: `git ${args.join(" ")} failed (exit ${res.status}): ${detail}`,
    };
  }
  return { ok: true, stdout: res.stdout };
};

const sortLex = (items: Iterable<string>): string[] =>
  [...new Set(items)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

const splitLines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.length > 0);

export const resolveMainDir = (cwd: string): GitResult => {
  const res = runGit(["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd });
  if (!res.ok) {
    return res;
  }
  return { ok: true, stdout: path.dirname(res.stdout.trim()) };
};

export const resolveRepoRoot = (cwd: string): GitResult => {
  const res = runGit(["rev-parse", "--show-toplevel"], { cwd });
  if (!res.ok) {
    return res;
  }
  return { ok: true, stdout: res.stdout.trim() };
};

export const getHeadSha = (repoRoot: string): GitResult => {
  const res = runGit(["rev-parse", "HEAD"], { cwd: repoRoot });
  if (!res.ok) {
    return res;
  }
  return { ok: true, stdout: res.stdout.trim() };
};

export const ensurePlansIgnored = (
  mainDir: string,
): { ok: true } | { ok: false; error: string } => {
  const check = spawnSync("git", ["-C", mainDir, "check-ignore", "-q", ".plans/"], {
    encoding: "utf8",
  });
  if (check.error !== undefined) {
    return { ok: false, error: check.error.message };
  }
  if (check.status === 0) {
    return { ok: true };
  }

  const excludePathRes = runGit(
    ["-C", mainDir, "rev-parse", "--path-format=absolute", "--git-path", "info/exclude"],
    { cwd: mainDir },
  );
  if (!excludePathRes.ok) {
    return excludePathRes;
  }

  const excludePath = excludePathRes.stdout.trim();
  try {
    fs.mkdirSync(path.dirname(excludePath), { recursive: true });
    let prefix = "";
    if (fs.existsSync(excludePath)) {
      const existing = fs.readFileSync(excludePath, "utf8");
      if (existing.length > 0 && !existing.endsWith("\n")) {
        prefix = "\n";
      }
    }
    fs.appendFileSync(excludePath, `${prefix}.plans/\n`, "utf8");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to update ${excludePath}: ${message}` };
  }
};

export const getUntrackedFiles = (
  repoRoot: string,
): { ok: true; files: string[] } | { ok: false; error: string } => {
  const res = runGit(["-c", "core.quotepath=off", "ls-files", "--others", "--exclude-standard"], {
    cwd: repoRoot,
  });
  if (!res.ok) {
    return res;
  }
  return { ok: true, files: splitLines(res.stdout) };
};

export const getUncommittedList = (
  repoRoot: string,
): { ok: true; files: string[] } | { ok: false; error: string } => {
  const diffRes = runGit(
    ["-c", "core.quotepath=off", "diff", "--name-only", "--no-renames", "HEAD"],
    { cwd: repoRoot },
  );
  if (!diffRes.ok) {
    return diffRes;
  }

  const untrackedRes = getUntrackedFiles(repoRoot);
  if (!untrackedRes.ok) {
    return untrackedRes;
  }

  const combined = [...splitLines(diffRes.stdout), ...untrackedRes.files].filter(
    (filePath) => !filePath.startsWith(".plans/"),
  );
  return { ok: true, files: sortLex(combined) };
};

const intentToAddUntracked = (
  repoRoot: string,
  paths: ReadonlyArray<string>,
): { ok: true } | { ok: false; error: string } => {
  if (paths.length === 0) {
    return { ok: true };
  }

  const untrackedRes = getUntrackedFiles(repoRoot);
  if (!untrackedRes.ok) {
    return untrackedRes;
  }

  const pathSet = new Set(paths);
  const toMark = untrackedRes.files.filter((filePath) => pathSet.has(filePath));
  if (toMark.length === 0) {
    return { ok: true };
  }

  const addRes = runGit(["add", "--intent-to-add", "--pathspec-from-file=-"], {
    cwd: repoRoot,
    env: { ...process.env, GIT_LITERAL_PATHSPECS: "1" },
    input: `${toMark.join("\n")}\n`,
  });
  if (!addRes.ok) {
    return addRes;
  }
  return { ok: true };
};

export const getDiffStat = (
  repoRoot: string,
  paths: ReadonlyArray<string>,
): { ok: true; stat: string } | { ok: false; error: string } => {
  if (paths.length === 0) {
    return { ok: true, stat: "" };
  }

  const markRes = intentToAddUntracked(repoRoot, paths);
  if (!markRes.ok) {
    return markRes;
  }

  const diffRes = runGit(["-c", "core.quotepath=off", "diff", "--stat", "HEAD", "--", ...paths], {
    cwd: repoRoot,
    env: { ...process.env, GIT_LITERAL_PATHSPECS: "1" },
  });
  if (!diffRes.ok) {
    return diffRes;
  }

  const lines = diffRes.stdout.trimEnd().split("\n");
  return { ok: true, stat: lines.slice(-40).join("\n") };
};

export const commitPaths = (
  repoRoot: string,
  listFilePath: string,
  messageFilePath: string,
  paths: ReadonlyArray<string>,
): { ok: true; summary: string } | { ok: false; error: string } => {
  if (paths.length === 0) {
    return { ok: false, error: `Refusing to commit empty list: ${listFilePath}` };
  }

  const markRes = intentToAddUntracked(repoRoot, paths);
  if (!markRes.ok) {
    return markRes;
  }

  const commitRes = runGit(
    ["commit", "-F", messageFilePath, `--pathspec-from-file=${listFilePath}`],
    {
      cwd: repoRoot,
      env: { ...process.env, GIT_LITERAL_PATHSPECS: "1" },
    },
  );
  if (!commitRes.ok) {
    return commitRes;
  }

  return { ok: true, summary: commitRes.stdout.trim() };
};
