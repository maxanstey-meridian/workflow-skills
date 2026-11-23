import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { writeTextAtomic } from "./io.ts";
import type { SizedFile } from "./schemas.ts";
import { OVERSIZED_LINE_LIMIT, TOP_BIGGEST_LIMIT } from "./transition.ts";

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const CHURN_LIMIT = 40;

const EXCLUDED_DIRS_RE =
  /(^|\/)(Migrations|migrations|generated|vendor|__snapshots__|__fixtures__|fixtures|\.nuxt)\//;
const EXCLUDED_FILES_RE =
  /(\.(g|Designer)\.cs|(lock\.json|\.lock|-lock\.yaml|\.snap|\.txt|\.csv|\.tsv))$/;
const DOTNET_WALK_SKIP_DIRS = new Set([".git", "node_modules", ".plans", "bin"]);

type GitResult = { ok: true; stdout: string } | { ok: false; error: string };

const runGit = (
  args: string[],
  opts: { cwd: string; allowExitOne?: boolean },
): { ok: true; stdout: string; status: number } | { ok: false; error: string } => {
  const res = spawnSync("git", args, {
    cwd: opts.cwd,
    encoding: "utf8",
    maxBuffer: MAX_BUFFER_BYTES,
  });
  if (res.error !== undefined) {
    return { ok: false, error: res.error.message };
  }
  const status = res.status ?? 1;
  if (status === 0 || (opts.allowExitOne === true && status === 1)) {
    return { ok: true, stdout: res.stdout, status };
  }
  const stderr = res.stderr.trim();
  const stdout = res.stdout.trim();
  const detail = stderr.length > 0 ? stderr : stdout;
  return {
    ok: false,
    error: `git ${args.join(" ")} failed (exit ${status}): ${detail}`,
  };
};

const splitLines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line.length > 0);

const sortCodePoint = (items: Iterable<string>): string[] =>
  [...new Set(items)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

export const resolveRepoRoot = (cwd: string): GitResult => {
  const res = runGit(["rev-parse", "--show-toplevel"], { cwd });
  if (!res.ok) {
    return res;
  }
  return { ok: true, stdout: res.stdout.trim() };
};

export const resolveMainDir = (cwd: string): GitResult => {
  const res = runGit(["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd });
  if (!res.ok) {
    return res;
  }
  return { ok: true, stdout: path.dirname(res.stdout.trim()) };
};

export const getHeadShortSha = (root: string): GitResult => {
  const res = runGit(["rev-parse", "--short", "HEAD"], { cwd: root });
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

export const collectScopedFiles = (
  root: string,
): { ok: true; files: string[] } | { ok: false; error: string } => {
  const allRes = runGit(
    [
      "-C",
      root,
      "-c",
      "core.quotePath=false",
      "grep",
      "-I",
      "-l",
      "--untracked",
      "-e",
      "",
      "--",
      ".",
    ],
    { cwd: root, allowExitOne: true },
  );
  if (!allRes.ok) {
    return allRes;
  }

  const txtBuildRes = runGit(
    [
      "-C",
      root,
      "-c",
      "core.quotePath=false",
      "grep",
      "-I",
      "-l",
      "--untracked",
      "-e",
      "",
      "--",
      "*CMakeLists.txt",
      "*requirements*.txt",
    ],
    { cwd: root, allowExitOne: true },
  );
  if (!txtBuildRes.ok) {
    return txtBuildRes;
  }

  const matchedAll = splitLines(allRes.stdout).filter(
    (filePath) => !EXCLUDED_DIRS_RE.test(filePath) && !EXCLUDED_FILES_RE.test(filePath),
  );
  const matchedTxtBuild = splitLines(txtBuildRes.stdout).filter(
    (filePath) => !EXCLUDED_DIRS_RE.test(filePath),
  );

  return {
    ok: true,
    files: sortCodePoint([...matchedAll, ...matchedTxtBuild]),
  };
};

const countNewlines = (buf: Buffer): number => {
  let count = 0;
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] === 0x0a) {
      count += 1;
    }
  }
  return count;
};

export type ComputedSizes = {
  sizesByFile: Map<string, number>;
  totalLines: number;
  topBiggest: SizedFile[];
  oversized: SizedFile[];
  sizesText: string;
};

export const computeSizes = (root: string, scopeFiles: ReadonlyArray<string>): ComputedSizes => {
  const sizesByFile = new Map<string, number>();
  const sizedFiles: SizedFile[] = [];
  const linesOut: string[] = [];
  let totalLines = 0;

  for (const relPath of scopeFiles) {
    const absPath = path.join(root, relPath);
    let lineCount = 0;
    try {
      const buf = fs.readFileSync(absPath);
      lineCount = countNewlines(buf);
    } catch {
      lineCount = 0;
    }
    sizesByFile.set(relPath, lineCount);
    sizedFiles.push({ path: relPath, lines: lineCount });
    linesOut.push(`${lineCount}\t${relPath}`);
    totalLines += lineCount;
  }

  const sortedBySize = [...sizedFiles].sort(
    (a, b) => b.lines - a.lines || a.path.localeCompare(b.path),
  );
  const topBiggest = sortedBySize.slice(0, TOP_BIGGEST_LIMIT);
  const oversized = sortedBySize.filter((file) => file.lines > OVERSIZED_LINE_LIMIT);
  const sizesText = linesOut.length > 0 ? `${linesOut.join("\n")}\n` : "";

  return {
    sizesByFile,
    totalLines,
    topBiggest,
    oversized,
    sizesText,
  };
};

export const computeChurn = (root: string, scopeFiles: ReadonlyArray<string>): string => {
  if (scopeFiles.length === 0) {
    return "";
  }
  const logRes = runGit(
    [
      "-C",
      root,
      "-c",
      "core.quotePath=false",
      "log",
      "--since=12.months",
      "--no-renames",
      "--format=",
      "--name-only",
      "--",
      ".",
    ],
    { cwd: root },
  );
  if (!logRes.ok) {
    return "";
  }

  const scopeSet = new Set(scopeFiles);
  const counts = new Map<string, number>();
  for (const line of splitLines(logRes.stdout)) {
    if (!scopeSet.has(line)) {
      continue;
    }
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, CHURN_LIMIT);

  if (ranked.length === 0) {
    return "";
  }
  return `${ranked.map(([filePath, count]) => `${String(count).padStart(7)} ${filePath}`).join("\n")}\n`;
};

const writeLeadFile = (runDir: string, fileName: string, content: string): void => {
  writeTextAtomic(path.join(runDir, fileName), content);
};

const hasNuxtConfig = (root: string): boolean => {
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    return entries.some((entry) => entry.isFile() && entry.name.startsWith("nuxt.config."));
  } catch {
    return false;
  }
};

const scanDotnetFiles = (root: string): { hasAssets: boolean; solutions: string[] } => {
  let hasAssets = false;
  const solutions: string[] = [];

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (DOTNET_WALK_SKIP_DIRS.has(entry.name)) {
          continue;
        }
        walk(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name === "project.assets.json" && path.basename(dir) === "obj") {
          hasAssets = true;
        } else if (entry.name.endsWith(".sln") || entry.name.endsWith(".slnx")) {
          solutions.push(path.relative(root, fullPath));
        }
      }
    }
  };

  walk(root);
  solutions.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { hasAssets, solutions };
};

const combineOutput = (stdout: string, stderr: string): string => {
  if (stdout.length === 0) {
    return stderr;
  }
  if (stderr.length === 0) {
    return stdout;
  }
  return stdout.endsWith("\n") ? `${stdout}${stderr}` : `${stdout}\n${stderr}`;
};

export type MechanicalFinderOptions = {
  lintCmd?: string;
  skipFinders?: boolean;
  deferJscpd?: boolean;
};

export const runJscpd = (root: string, runDir: string, scopeFiles: ReadonlyArray<string>): void => {
  const jscpdConfigPath = path.join(runDir, "jscpd.json");
  if (scopeFiles.length === 0) {
    fs.rmSync(jscpdConfigPath, { force: true });
    writeLeadFile(runDir, "leads-jscpd.txt", "");
    return;
  }
  const jscpdConfig = {
    path: scopeFiles.map((filePath) => path.join(root, filePath)),
  };
  writeLeadFile(runDir, "jscpd.json", `${JSON.stringify(jscpdConfig, null, 2)}\n`);
  const res = spawnSync(
    "npx",
    ["--yes", "jscpd@5", "--config", jscpdConfigPath, "--reporters", "console"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: MAX_BUFFER_BYTES,
    },
  );
  if (res.error !== undefined) {
    writeLeadFile(runDir, "leads-jscpd.txt", `skipped: ${res.error.message}\n`);
  } else {
    writeLeadFile(runDir, "leads-jscpd.txt", combineOutput(res.stdout, res.stderr));
  }
};

export const runMechanicalFinders = (
  root: string,
  runDir: string,
  scopeFiles: ReadonlyArray<string>,
  opts: MechanicalFinderOptions = {},
): void => {
  if (opts.skipFinders === true) {
    writeLeadFile(runDir, "leads-knip.txt", "skipped: --skip-finders\n");
    writeLeadFile(runDir, "leads-jscpd.txt", "skipped: --skip-finders\n");
    return;
  }

  // 1. knip (when package.json exists)
  if (fs.existsSync(path.join(root, "package.json"))) {
    if (hasNuxtConfig(root) && !fs.existsSync(path.join(root, ".nuxt"))) {
      writeLeadFile(runDir, "leads-knip.txt", "skipped: Nuxt project without .nuxt directory\n");
    } else {
      const localKnip = path.join(root, "node_modules", ".bin", "knip");
      const cmd = fs.existsSync(localKnip) ? localKnip : "npx";
      const args = fs.existsSync(localKnip) ? [] : ["--yes", "knip@5"];
      const res = spawnSync(cmd, args, {
        cwd: root,
        encoding: "utf8",
        maxBuffer: MAX_BUFFER_BYTES,
      });
      if (res.error !== undefined) {
        writeLeadFile(runDir, "leads-knip.txt", `skipped: ${res.error.message}\n`);
      } else {
        writeLeadFile(runDir, "leads-knip.txt", combineOutput(res.stdout, res.stderr));
      }
    }
  }

  // 2. jscpd (any stack, restricted to scope.txt)
  if (opts.deferJscpd !== true && scopeFiles.length > 0) {
    runJscpd(root, runDir, scopeFiles);
  }

  // 3. .NET (only if solutions exist; requires obj/project.assets.json without restoring)
  const dotnet = scanDotnetFiles(root);
  if (dotnet.solutions.length > 0) {
    if (!dotnet.hasAssets) {
      writeLeadFile(
        runDir,
        "leads-dotnet-format.txt",
        "skipped: no obj/project.assets.json (restore required)\n",
      );
    } else {
      const formatLines: string[] = [];
      let dotnetUnavailable: string | undefined;
      for (const solution of dotnet.solutions) {
        const res = spawnSync(
          "dotnet",
          [
            "format",
            "style",
            solution,
            "--verify-no-changes",
            "--no-restore",
            "--severity",
            "hidden",
            "--diagnostics",
            "IDE0051",
            "IDE0052",
            "IDE0060",
            "--include",
            ".",
          ],
          {
            cwd: root,
            encoding: "utf8",
            maxBuffer: MAX_BUFFER_BYTES,
          },
        );
        if (res.error !== undefined) {
          dotnetUnavailable = res.error.message;
          break;
        }
        const combined = combineOutput(res.stdout, res.stderr);
        for (const line of splitLines(combined)) {
          if (/IDE00(51|52|60)/.test(line)) {
            formatLines.push(line);
          }
        }
      }
      if (dotnetUnavailable !== undefined) {
        writeLeadFile(runDir, "leads-dotnet-format.txt", `skipped: ${dotnetUnavailable}\n`);
      } else {
        writeLeadFile(
          runDir,
          "leads-dotnet-format.txt",
          formatLines.length > 0 ? `${formatLines.join("\n")}\n` : "",
        );
      }

      const jbCheck = spawnSync("jb", ["--version"], { cwd: root, encoding: "utf8" });
      if (jbCheck.error !== undefined || jbCheck.status !== 0) {
        writeLeadFile(runDir, "leads-inspectcode.txt", "skipped: jb not installed\n");
      } else {
        const inspectParts: string[] = [];
        const inspectErrors: Array<{ solution: string; reason: string }> = [];
        for (let i = 0; i < dotnet.solutions.length; i += 1) {
          const solution = dotnet.solutions[i];
          if (solution === undefined) {
            continue;
          }
          const tmpOutPath = path.join(runDir, `.leads-inspectcode-${i}.tmp`);
          try {
            const jbRes = spawnSync(
              "jb",
              ["inspectcode", solution, "--no-build", "--swea", `-o=${tmpOutPath}`],
              {
                cwd: root,
                encoding: "utf8",
                maxBuffer: MAX_BUFFER_BYTES,
              },
            );
            if (jbRes.error !== undefined) {
              inspectErrors.push({ solution, reason: jbRes.error.message });
              break;
            }
            if (fs.existsSync(tmpOutPath)) {
              const content = fs.readFileSync(tmpOutPath, "utf8");
              if (content.length > 0) {
                inspectParts.push(content.endsWith("\n") ? content : `${content}\n`);
              }
            } else if (jbRes.status !== 0) {
              const detail = combineOutput(jbRes.stdout, jbRes.stderr).trim();
              const reason =
                detail.length > 0
                  ? `jb inspectcode exited ${jbRes.status ?? 1}: ${detail}`
                  : `jb inspectcode exited ${jbRes.status ?? 1}`;
              inspectErrors.push({ solution, reason });
            }
          } finally {
            fs.rmSync(tmpOutPath, { force: true });
          }
        }
        if (inspectParts.length > 0) {
          const failureLines = inspectErrors.map(
            ({ solution, reason }) => `skipped (${solution}): ${reason}\n`,
          );
          writeLeadFile(
            runDir,
            "leads-inspectcode.txt",
            `${inspectParts.join("")}${failureLines.join("")}`,
          );
        } else if (inspectErrors.length > 0) {
          const failureLines = inspectErrors.map(
            ({ solution, reason }) => `skipped: ${solution}: ${reason}\n`,
          );
          writeLeadFile(runDir, "leads-inspectcode.txt", failureLines.join(""));
        } else {
          writeLeadFile(runDir, "leads-inspectcode.txt", "");
        }
      }
    }
  }

  // 4. Optional repo linter command
  if (opts.lintCmd !== undefined && opts.lintCmd.trim().length > 0) {
    const res = spawnSync(opts.lintCmd, {
      cwd: root,
      shell: true,
      encoding: "utf8",
      maxBuffer: MAX_BUFFER_BYTES,
    });
    if (res.error !== undefined) {
      writeLeadFile(runDir, "leads-lint.txt", `skipped: ${res.error.message}\n`);
    } else {
      writeLeadFile(runDir, "leads-lint.txt", combineOutput(res.stdout, res.stderr));
    }
  }
};
