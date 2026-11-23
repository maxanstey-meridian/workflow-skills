import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadOracleFiles, readJsonFile, writeJsonAtomic } from "../io.ts";
import { validateLoadedCase } from "../merge.ts";
import {
  isUrlSourceRef,
  type LoadedOracleFile,
  type Locked,
  type OracleConf,
  OracleConfSchema,
  rowLockHash,
  stripSourceRefLocator,
} from "../schema.ts";

const findGitRepoRoot = (dir: string): string | null => {
  const res = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: dir,
    encoding: "utf8",
  });
  if (res.error || res.status !== 0) {
    return null;
  }
  const root = res.stdout.trim();
  return root.length > 0 ? root : null;
};

const toRepoRelativePath = (caseDir: string, repoRoot: string, ref: string): string | null => {
  const raw = stripSourceRefLocator(ref).replace(/\\/g, "/");
  if (raw.length === 0) {
    return null;
  }
  const realCaseDir = fs.realpathSync(caseDir);
  const realRepoRoot = fs.realpathSync(repoRoot);
  const rel =
    raw.startsWith("./") || raw.startsWith("../")
      ? path.relative(realRepoRoot, path.resolve(realCaseDir, raw)).replace(/\\/g, "/")
      : raw.replace(/^\/+/, "");
  if (rel.length === 0 || rel === ".." || rel.startsWith("../") || path.isAbsolute(rel)) {
    return null;
  }
  return rel;
};

const isExistingFile = (absPath: string): boolean => {
  try {
    return fs.statSync(absPath).isFile();
  } catch {
    return false;
  }
};

const checkSourceRefsOnDisk = (caseDir: string, files: readonly LoadedOracleFile[]): string[] => {
  const candidates: Array<{ fileName: string; rowId: string; sourceRef: string; repoRel: string }> =
    [];
  const errors: string[] = [];

  const repoRoot = findGitRepoRoot(caseDir);
  const baseDir = repoRoot ?? caseDir;

  for (const file of files) {
    for (const row of file.data.rows) {
      if (row.sourceRef === undefined || isUrlSourceRef(row.sourceRef)) {
        continue;
      }

      if (row.source === "written") {
        const raw = stripSourceRefLocator(row.sourceRef).replace(/\\/g, "/");
        const resolved =
          raw.startsWith("./") || raw.startsWith("../")
            ? path.resolve(caseDir, raw)
            : path.resolve(baseDir, raw);
        if (!isExistingFile(resolved)) {
          errors.push(
            `${file.fileName} [${row.id}]: sourceRef "${row.sourceRef}" does not exist on disk`,
          );
        }
      }

      if (repoRoot !== null) {
        const repoRel = toRepoRelativePath(caseDir, repoRoot, row.sourceRef);
        if (repoRel !== null) {
          candidates.push({
            fileName: file.fileName,
            rowId: row.id,
            sourceRef: row.sourceRef,
            repoRel,
          });
        }
      }
    }
  }

  if (repoRoot === null || candidates.length === 0) {
    return errors;
  }

  const uniquePaths = [...new Set(candidates.map((c) => c.repoRel))];
  const check = spawnSync("git", ["check-ignore", "--stdin", "-z"], {
    cwd: repoRoot,
    input: `${uniquePaths.join("\0")}\0`,
    encoding: "utf8",
  });

  if (check.error || (check.status !== 0 && check.status !== 1)) {
    return errors;
  }

  const ignored = new Set(check.stdout.split("\0").filter((p) => p.length > 0));
  for (const candidate of candidates) {
    if (ignored.has(candidate.repoRel)) {
      errors.push(
        `${candidate.fileName} [${candidate.rowId}]: sourceRef "${candidate.sourceRef}" is gitignored; gitignored files cannot back oracle expectations`,
      );
    }
  }
  return errors;
};

const validateCaseOnDisk = (
  caseDir: string,
): { ok: true; conf: OracleConf; files: LoadedOracleFile[] } | { ok: false; errors: string[] } => {
  const confRes = readJsonFile(
    path.join(caseDir, "oracle.conf.json"),
    OracleConfSchema,
    "oracle.conf.json",
  );
  if (!confRes.ok) {
    return { ok: false, errors: [confRes.error] };
  }
  const conf = confRes.data;

  const filesRes = loadOracleFiles(caseDir);
  if (!filesRes.ok) {
    return { ok: false, errors: filesRes.errors };
  }

  const validated = validateLoadedCase(conf, filesRes.files);
  const diskErrors = checkSourceRefsOnDisk(caseDir, filesRes.files);
  const allErrors = [...(validated.ok ? [] : validated.errors), ...diskErrors];
  if (allErrors.length > 0) {
    return { ok: false, errors: allErrors };
  }

  return { ok: true, conf, files: filesRes.files };
};

export const cmdValidate = (caseArg: string): number => {
  const caseDir = path.resolve(caseArg);
  const res = validateCaseOnDisk(caseDir);
  if (!res.ok) {
    for (const err of res.errors) {
      console.error(`validate: ${err}`);
    }
    return 1;
  }
  const totalRows = res.files.reduce((sum, f) => sum + f.data.rows.length, 0);
  console.log(`Valid: ${res.files.length} slice(s), ${totalRows} row(s)`);
  return 0;
};

export const cmdLock = (caseArg: string): number => {
  const caseDir = path.resolve(caseArg);
  const res = validateCaseOnDisk(caseDir);
  if (!res.ok) {
    for (const err of res.errors) {
      console.error(`lock: ${err}`);
    }
    return 1;
  }

  const errors: string[] = [];
  const hashes: Record<string, string> = {};

  for (const file of res.files) {
    for (const row of file.data.rows) {
      if (row.question !== null) {
        errors.push(`${file.fileName} [${row.id}]: unanswered question blocks lock`);
      }
      if (row.gone === true && row.status !== "struck") {
        errors.push(`${file.fileName} [${row.id}]: gone row must be status "struck" before lock`);
      }
      hashes[row.id] = rowLockHash(row);
    }
  }

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`lock: ${err}`);
    }
    return 1;
  }

  const locked: Locked = {
    lockedAt: new Date().toISOString(),
    kind: res.conf.kind,
    rows: hashes,
  };

  writeJsonAtomic(path.join(caseDir, "locked.json"), locked);
  console.log(`Locked ${Object.keys(hashes).length} row(s)`);
  return 0;
};
