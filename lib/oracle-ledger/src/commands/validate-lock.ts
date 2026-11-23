import path from "node:path";
import { loadOracleFiles, readJsonFile, writeJsonAtomic } from "../io.ts";
import { validateLoadedCase } from "../merge.ts";
import {
  type LoadedOracleFile,
  type Locked,
  type OracleConf,
  OracleConfSchema,
  rowLockHash,
} from "../schema.ts";

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
  if (!validated.ok) {
    return { ok: false, errors: validated.errors };
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
