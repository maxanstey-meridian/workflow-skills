import { Command, CommanderError } from "commander";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import type { ValidationIssue } from "../../contracts/src/spec-schema.ts";
import { DESIGN_REPORT_FILE_NAME, SCOPE_FILE_NAME, SIZES_FILE_NAME } from "./briefs.ts";
import {
  applySlopEffects,
  createRunDir,
  loadHuntSnapshot,
  readListFile,
  readSizesFile,
  readState,
  readTypedYamlFile,
  writeListFile,
  writeState,
  writeTextAtomic,
} from "./io.ts";
import { renderSlopAudit } from "./render.ts";
import {
  AreasInputSchema,
  type DesignReport,
  DesignReportSchema,
  type HunterReport,
  HunterReportSchema,
  SlopAuditSchema,
  type SlopAction,
  type SlopState,
  VerifyReportSchema,
} from "./schemas.ts";
import {
  collectScopedFiles,
  computeChurn,
  computeSizes,
  ensurePlansIgnored,
  getHeadShortSha,
  resolveMainDir,
  resolveRepoRoot,
  runJscpd,
  runMechanicalFinders,
} from "./scope.ts";
import { advanceSlop } from "./transition.ts";
import {
  validateAreasAgainstScope,
  validateDesignReport,
  validateHunterReport,
  validateSlopAudit,
  validateVerifyAgainstReport,
} from "./validate.ts";

const DEFAULT_SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEFT_OUT_FILE_NAME = "left-out.txt";
const CHURN_FILE_NAME = "churn.txt";

const VALIDATE_ROLES = ["areas", "design-reader", "hunter", "verifier", "reporter"] as const;
type ValidateRole = (typeof VALIDATE_ROLES)[number];

const isValidateRole = (value: string): value is ValidateRole =>
  VALIDATE_ROLES.some((role) => role === value);

const printYaml = (value: unknown): void => {
  process.stdout.write(YAML.stringify(value, { lineWidth: 0 }));
};

const printIssues = (issues: ReadonlyArray<ValidationIssue>): void => {
  for (const issue of issues) {
    console.error(`${issue.path}: ${issue.message}`);
  }
};

const printStrings = (lines: ReadonlyArray<string>): void => {
  for (const line of lines) {
    console.error(line);
  }
};

const normalizeRelPath = (rawPath: string): string => rawPath.replace(/^(?:\.\/)+/, "");

const cmdInit = (opts: { skill?: string; lintCmd?: string; skipFinders?: boolean }): number => {
  const cwd = process.cwd();
  const rootRes = resolveRepoRoot(cwd);
  if (!rootRes.ok) {
    console.error(rootRes.error);
    return 2;
  }
  const root = rootRes.stdout;

  const mainRes = resolveMainDir(cwd);
  if (!mainRes.ok) {
    console.error(mainRes.error);
    return 2;
  }
  const mainDir = mainRes.stdout;

  const headRes = getHeadShortSha(root);
  if (!headRes.ok) {
    console.error(headRes.error);
    return 2;
  }
  const head = headRes.stdout;

  const ignoreRes = ensurePlansIgnored(mainDir);
  if (!ignoreRes.ok) {
    console.error(ignoreRes.error);
    return 2;
  }

  const scopeRes = collectScopedFiles(root);
  if (!scopeRes.ok) {
    console.error(scopeRes.error);
    return 2;
  }
  const scopeFiles = scopeRes.files;

  if (scopeFiles.length === 0) {
    const stopAction: SlopAction = {
      action: "stop",
      reason: "No scannable files found in repository.",
    };
    printYaml(stopAction);
    return 0;
  }

  const skillDir = opts.skill !== undefined ? path.resolve(opts.skill) : DEFAULT_SKILL_DIR;
  const runDir = createRunDir(mainDir);
  const sizes = computeSizes(root, scopeFiles);
  const churn = computeChurn(root, scopeFiles);

  writeListFile(path.join(runDir, SCOPE_FILE_NAME), scopeFiles);
  writeTextAtomic(path.join(runDir, SIZES_FILE_NAME), sizes.sizesText);
  writeTextAtomic(path.join(runDir, CHURN_FILE_NAME), churn);

  runMechanicalFinders(root, runDir, scopeFiles, {
    lintCmd: opts.lintCmd,
    skipFinders: opts.skipFinders,
    deferJscpd: sizes.oversized.length > 0,
  });

  const initialState: SlopState = {
    root,
    mainDir,
    skillDir,
    runDir,
    head,
    scopeReviewed: false,
    areasSplit: false,
    retries: {},
    phase: "init",
  };
  writeState(runDir, initialState);

  printYaml({
    run: runDir,
    root,
    head,
    totalFiles: scopeFiles.length,
    totalLines: sizes.totalLines,
    topBiggest: sizes.topBiggest,
    oversized: sizes.oversized,
  });
  return 0;
};

const cmdExclude = (runDirArg: string, pathsArg: string[], opts: { done?: boolean }): number => {
  const runDir = path.resolve(runDirArg);
  const stateRes = readState(runDir);
  if (!stateRes.ok) {
    console.error(stateRes.error);
    return 2;
  }
  const state = stateRes.state;

  const scopePath = path.join(runDir, SCOPE_FILE_NAME);
  if (!fs.existsSync(scopePath)) {
    console.error(`Missing scope file: ${scopePath}`);
    return 2;
  }

  const currentScope = readListFile(scopePath);
  const excludeSet = new Set(pathsArg.map(normalizeRelPath));
  const removed: string[] = [];
  const nextScope: string[] = [];

  for (const filePath of currentScope) {
    if (excludeSet.has(filePath)) {
      removed.push(filePath);
    } else {
      nextScope.push(filePath);
    }
  }

  const leftOutPath = path.join(runDir, LEFT_OUT_FILE_NAME);
  const existingLeftOut = readListFile(leftOutPath);
  const leftOutSet = new Set(existingLeftOut);
  const nextLeftOut = [...existingLeftOut];
  for (const filePath of removed) {
    if (!leftOutSet.has(filePath)) {
      leftOutSet.add(filePath);
      nextLeftOut.push(filePath);
    }
  }

  const sizes = computeSizes(state.root, nextScope);
  const churn = computeChurn(state.root, nextScope);

  writeListFile(scopePath, nextScope);
  if (nextLeftOut.length > 0) {
    writeListFile(leftOutPath, nextLeftOut);
  }
  writeTextAtomic(path.join(runDir, SIZES_FILE_NAME), sizes.sizesText);
  writeTextAtomic(path.join(runDir, CHURN_FILE_NAME), churn);

  const scopeReviewed = state.scopeReviewed || opts.done === true || sizes.oversized.length === 0;
  const jscpdLeadsPath = path.join(runDir, "leads-jscpd.txt");
  const jscpdSkipped =
    fs.existsSync(jscpdLeadsPath) &&
    fs.readFileSync(jscpdLeadsPath, "utf8").trim() === "skipped: --skip-finders";
  if (!jscpdSkipped && scopeReviewed && (!state.scopeReviewed || removed.length > 0)) {
    runJscpd(state.root, runDir, nextScope);
  }
  const nextState: SlopState = {
    ...state,
    scopeReviewed,
  };
  writeState(runDir, nextState);

  printYaml({
    excluded: removed,
    remainingFiles: nextScope.length,
    totalLines: sizes.totalLines,
    oversized: sizes.oversized,
    scopeReviewed,
  });
  return 0;
};

const cmdNext = (runDirArg: string): number => {
  const runDir = path.resolve(runDirArg);
  const stateRes = readState(runDir);
  if (!stateRes.ok) {
    console.error(stateRes.error);
    return 2;
  }
  const state = stateRes.state;

  const snapshotRes = loadHuntSnapshot(runDir);
  if (!snapshotRes.ok) {
    console.error(snapshotRes.error);
    return 2;
  }

  const transition = advanceSlop(state, snapshotRes.snapshot);
  applySlopEffects(runDir, transition.effects);
  writeState(runDir, transition.nextState);
  printYaml(transition.action);
  return 0;
};

const loadTargetReportForVerifier = (
  targetPath: string,
): { ok: true; report: DesignReport | HunterReport } | { ok: false; error: string } => {
  const resolvedTarget = path.resolve(targetPath);
  const isDesignByName = path.basename(resolvedTarget) === DESIGN_REPORT_FILE_NAME;

  if (isDesignByName) {
    const res = readTypedYamlFile(resolvedTarget, DesignReportSchema);
    if (res.ok) {
      return { ok: true, report: res.data };
    }
    const detail = res.kind === "io" ? res.error : res.details.join("; ");
    return { ok: false, error: `Invalid target report ${resolvedTarget}: ${detail}` };
  }

  const hunterRes = readTypedYamlFile(resolvedTarget, HunterReportSchema);
  if (hunterRes.ok) {
    return { ok: true, report: hunterRes.data };
  }
  if (hunterRes.kind === "io") {
    return { ok: false, error: hunterRes.error };
  }

  const designRes = readTypedYamlFile(resolvedTarget, DesignReportSchema);
  if (designRes.ok) {
    return { ok: true, report: designRes.data };
  }

  return {
    ok: false,
    error: `Invalid target report ${resolvedTarget}: ${hunterRes.details.join("; ")}`,
  };
};

const cmdValidate = (
  rawRole: string,
  fileArg: string,
  opts: { report?: string; scope?: string; sizes?: string; singleArea?: boolean },
): number => {
  if (!isValidateRole(rawRole)) {
    console.error(
      `Unknown validate role "${rawRole}". Expected one of: ${VALIDATE_ROLES.join(", ")}`,
    );
    return 2;
  }

  const filePath = path.resolve(fileArg);

  if (rawRole === "areas") {
    const scopePath =
      opts.scope !== undefined
        ? path.resolve(opts.scope)
        : path.join(path.dirname(filePath), SCOPE_FILE_NAME);
    const sizesPath =
      opts.sizes !== undefined
        ? path.resolve(opts.sizes)
        : path.join(path.dirname(filePath), SIZES_FILE_NAME);

    if (!fs.existsSync(scopePath)) {
      console.error(`Missing scope file: ${scopePath}`);
      return 2;
    }
    const sizesRes = readSizesFile(sizesPath);
    if (!sizesRes.ok) {
      console.error(sizesRes.error);
      return 2;
    }

    const loaded = readTypedYamlFile(filePath, AreasInputSchema);
    if (!loaded.ok) {
      if (loaded.kind === "io") {
        console.error(loaded.error);
        return 2;
      }
      printStrings(loaded.details);
      return 1;
    }

    const scopeFiles = readListFile(scopePath);
    const validated = validateAreasAgainstScope(
      loaded.data.areas,
      scopeFiles,
      sizesRes.sizesByFile,
    );
    if (validated.issues.length > 0) {
      printIssues(validated.issues);
      return 1;
    }

    console.log("OK");
    return 0;
  }

  if (rawRole === "design-reader") {
    const loaded = readTypedYamlFile(filePath, DesignReportSchema);
    if (!loaded.ok) {
      if (loaded.kind === "io") {
        console.error(loaded.error);
        return 2;
      }
      printStrings(loaded.details);
      return 1;
    }

    const issues = validateDesignReport(loaded.data);
    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }

    console.log("OK");
    return 0;
  }

  if (rawRole === "hunter") {
    const loaded = readTypedYamlFile(filePath, HunterReportSchema);
    if (!loaded.ok) {
      if (loaded.kind === "io") {
        console.error(loaded.error);
        return 2;
      }
      printStrings(loaded.details);
      return 1;
    }

    const issues = validateHunterReport(loaded.data, { singleArea: Boolean(opts.singleArea) });
    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }

    console.log("OK");
    return 0;
  }

  if (rawRole === "verifier") {
    if (opts.report === undefined) {
      console.error('--report <target> is required when validating "verifier"');
      return 2;
    }
    const targetRes = loadTargetReportForVerifier(opts.report);
    if (!targetRes.ok) {
      console.error(targetRes.error);
      return 2;
    }

    const loaded = readTypedYamlFile(filePath, VerifyReportSchema);
    if (!loaded.ok) {
      if (loaded.kind === "io") {
        console.error(loaded.error);
        return 2;
      }
      printStrings(loaded.details);
      return 1;
    }

    const issues = validateVerifyAgainstReport(loaded.data, targetRes.report);
    if (issues.length > 0) {
      printIssues(issues);
      return 1;
    }

    console.log("OK");
    return 0;
  }

  const loaded = readTypedYamlFile(filePath, SlopAuditSchema);
  if (!loaded.ok) {
    if (loaded.kind === "io") {
      console.error(loaded.error);
      return 2;
    }
    printStrings(loaded.details);
    return 1;
  }

  const issues = validateSlopAudit(loaded.data);
  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  console.log("OK");
  return 0;
};

const cmdRender = (auditArg: string): number => {
  const filePath = path.resolve(auditArg);
  const loaded = readTypedYamlFile(filePath, SlopAuditSchema);
  if (!loaded.ok) {
    if (loaded.kind === "io") {
      console.error(loaded.error);
      return 2;
    }
    printStrings(loaded.details);
    return 1;
  }

  const issues = validateSlopAudit(loaded.data);
  if (issues.length > 0) {
    printIssues(issues);
    return 1;
  }

  process.stdout.write(renderSlopAudit(loaded.data));
  return 0;
};

const program = new Command();
program
  .name("slop-ctl")
  .description("Deterministic state-machine CLI for /slop-hunt")
  .exitOverride();

program
  .command("init")
  .description("Collect repository scope, sizes, churn, mechanical leads, and initialise a run")
  .option("--skill <dir>", "Path to skills/slop-hunt directory")
  .option("--lint-cmd <cmd>", "Optional repository lint command to run for leads-lint.txt")
  .option("--skip-finders", "Skip external mechanical finders and write skipped markers")
  .action((opts: { skill?: string; lintCmd?: string; skipFinders?: boolean }) => {
    process.exitCode = cmdInit(opts);
  });

program
  .command("exclude")
  .description(
    "Exclude non-code data paths from scope.txt, recompute sizes/churn, and update state",
  )
  .argument("<run>", "Path to the /slop-hunt run directory")
  .argument("[paths...]", "Repo-relative paths to exclude from scope")
  .option("--done", "Mark scope review complete even if oversized files remain")
  .action((run: string, paths: string[], opts: { done?: boolean }) => {
    process.exitCode = cmdExclude(run, paths, opts);
  });

program
  .command("next")
  .description("Advance /slop-hunt state and emit the next YAML action")
  .argument("<run>", "Path to the /slop-hunt run directory")
  .action((run: string) => {
    process.exitCode = cmdNext(run);
  });

program
  .command("validate")
  .description("Validate a /slop-hunt YAML artifact")
  .argument("<role>", `Artifact role (${VALIDATE_ROLES.join(" | ")})`)
  .argument("<file>", "Path to the YAML file to validate")
  .option("--report <target>", "Target report YAML (required for verifier)")
  .option("--scope <scope.txt>", "Path to scope.txt (defaults to sibling of areas.yaml)")
  .option("--sizes <sizes.txt>", "Path to sizes.txt (defaults to sibling of areas.yaml)")
  .option("--single-area", "Require houseShape on hunter report")
  .action(
    (
      role: string,
      file: string,
      opts: { report?: string; scope?: string; sizes?: string; singleArea?: boolean },
    ) => {
      process.exitCode = cmdValidate(role, file, opts);
    },
  );

program
  .command("render")
  .description("Validate audit.yaml and render the Markdown slop-hunt report to stdout")
  .argument("<audit.yaml>", "Path to audit.yaml")
  .action((auditPath: string) => {
    process.exitCode = cmdRender(auditPath);
  });

try {
  program.parse(process.argv);
} catch (err) {
  if (err instanceof CommanderError) {
    process.exitCode = err.exitCode === 0 ? 0 : 2;
  } else {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    process.exitCode = 2;
  }
}
