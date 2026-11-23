import { Command, CommanderError } from "commander";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { registerContractCommands } from "../../contracts/src/commands.ts";
import type { Spec } from "../../contracts/src/spec-schema.ts";
import {
  commitPaths,
  ensurePlansIgnored,
  getDiffStat,
  getHeadSha,
  getUncommittedList,
  resolveMainDir,
  resolveRepoRoot,
} from "./git.ts";
import {
  applyCycleEffects,
  checkGoAuditForInit,
  collectExistingFindingPaths,
  createRunDir,
  loadReviewFindingsForAudit,
  loadRunReports,
  loadSpecForCycle,
  readGateLog,
  readListFile,
  readRawYamlEntry,
  readState,
  syncSliceFiles,
  writeListFile,
  writeStackLists,
  writeState,
} from "./io.ts";
import { autoSlice } from "./slices.ts";
import { CycleModeSchema, type CycleAction, type CycleState } from "./state.ts";
import { advanceCycle } from "./transition.ts";

const DEFAULT_SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const printYaml = (value: unknown): void => {
  process.stdout.write(YAML.stringify(value, { lineWidth: 0 }));
};

const normalizeExcludePath = (rawPath: string): string => rawPath.replace(/^(?:\.\/)+/, "");

const collectRepeatable = (value: string, previous: string[]): string[] => [...previous, value];

const cmdInit = (opts: {
  spec?: string;
  mode: string;
  allowPartial?: boolean;
  exclude: string[];
  skill?: string;
}): number => {
  const parsedMode = CycleModeSchema.safeParse(opts.mode);
  if (!parsedMode.success) {
    console.error(`Invalid --mode "${opts.mode}". Expected "diff" or "full".`);
    return 2;
  }

  const cwd = process.cwd();
  const mainDirRes = resolveMainDir(cwd);
  if (!mainDirRes.ok) {
    console.error(mainDirRes.error);
    return 2;
  }
  const mainDir = mainDirRes.stdout;

  const repoRootRes = resolveRepoRoot(cwd);
  if (!repoRootRes.ok) {
    console.error(repoRootRes.error);
    return 2;
  }
  const repoRoot = repoRootRes.stdout;

  const skillDir = opts.skill !== undefined ? path.resolve(opts.skill) : DEFAULT_SKILL_DIR;

  let resolvedSpecPath: string | null = null;
  let loadedSpec: Spec | null = null;

  if (opts.spec !== undefined) {
    resolvedSpecPath = path.isAbsolute(opts.spec) ? opts.spec : path.resolve(mainDir, opts.spec);

    const specRes = loadSpecForCycle(resolvedSpecPath);
    if (!specRes.ok) {
      if (specRes.kind === "io") {
        console.error(specRes.error);
        return 2;
      }
      const stopAction: CycleAction = {
        action: "stop",
        reason: `Spec at ${resolvedSpecPath} is invalid`,
        details: specRes.issues,
      };
      printYaml(stopAction);
      return 0;
    }

    loadedSpec = specRes.spec;
    if (loadedSpec.status !== "building") {
      const stopAction: CycleAction = {
        action: "stop",
        reason: `Spec must have status "building" to run /cycle (got "${loadedSpec.status}")`,
        details: [resolvedSpecPath],
      };
      printYaml(stopAction);
      return 0;
    }

    if (opts.allowPartial !== true) {
      const goAuditCheck = checkGoAuditForInit(mainDir, resolvedSpecPath, loadedSpec);
      if (!goAuditCheck.ok) {
        const stopAction: CycleAction = {
          action: "stop",
          reason: goAuditCheck.reason,
          details: goAuditCheck.details,
        };
        printYaml(stopAction);
        return 0;
      }
    }
  }

  const uncommittedRes = getUncommittedList(repoRoot);
  if (!uncommittedRes.ok) {
    console.error(uncommittedRes.error);
    return 2;
  }

  const allFiles = uncommittedRes.files;
  const excludeSet = new Set(opts.exclude.map(normalizeExcludePath));
  const leftOut = allFiles.filter((filePath) => excludeSet.has(filePath));
  const leftOutSet = new Set(leftOut);
  const scope = allFiles.filter((filePath) => !leftOutSet.has(filePath));

  if (scope.length === 0) {
    const stopAction: CycleAction = {
      action: "stop",
      reason: "Nothing to cycle: no uncommitted files in scope.",
    };
    printYaml(stopAction);
    return 0;
  }

  const ignoreRes = ensurePlansIgnored(mainDir);
  if (!ignoreRes.ok) {
    console.error(ignoreRes.error);
    return 2;
  }

  const headRes = getHeadSha(repoRoot);
  if (!headRes.ok) {
    console.error(headRes.error);
    return 2;
  }

  const runDir = createRunDir(mainDir);
  fs.writeFileSync(path.join(runDir, "base.txt"), `${headRes.stdout}\n`, "utf8");
  writeListFile(path.join(runDir, "all.txt"), allFiles);
  writeListFile(path.join(runDir, "left-out.txt"), leftOut);
  writeListFile(path.join(runDir, "scope.txt"), scope);

  const auto = autoSlice(scope);
  let state: CycleState;
  if (auto !== null) {
    const slicesMap: Record<string, string[]> = {};
    for (const entry of auto.slices) {
      slicesMap[String(entry.id)] = [...entry.files];
    }
    syncSliceFiles(runDir, slicesMap);
    writeStackLists(runDir, auto.stacks);

    state = {
      specPath: resolvedSpecPath,
      mode: parsedMode.data,
      mainDir,
      repoRoot,
      skillDir,
      runDir,
      round: 1,
      phase: { kind: "review_ready" },
      slices: slicesMap,
      stackFiles: {
        backend: auto.stacks.backend.map((_, idx) => `stack-backend-${idx + 1}.txt`),
        frontend: auto.stacks.frontend.map((_, idx) => `stack-frontend-${idx + 1}.txt`),
      },
      retries: {},
      committedLists: [],
      missedReports: [],
    };
  } else {
    state = {
      specPath: resolvedSpecPath,
      mode: parsedMode.data,
      mainDir,
      repoRoot,
      skillDir,
      runDir,
      round: 1,
      phase: { kind: "await_slices", errors: [] },
      slices: {},
      stackFiles: { backend: [], frontend: [] },
      retries: {},
      committedLists: [],
      missedReports: [],
    };
  }

  writeState(runDir, state);
  printYaml({ run: runDir });
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

  let spec: Spec | null = null;
  if (state.specPath !== null) {
    const specRes = loadSpecForCycle(state.specPath);
    if (!specRes.ok) {
      const msg = specRes.kind === "io" ? specRes.error : specRes.issues.join("; ");
      console.error(`Failed to load spec ${state.specPath}: ${msg}`);
      return 2;
    }
    spec = specRes.spec;
  }

  const uncommittedRes = getUncommittedList(state.repoRoot);
  if (!uncommittedRes.ok) {
    console.error(uncommittedRes.error);
    return 2;
  }

  const scope = readListFile(path.join(runDir, "scope.txt"));
  const leftOut = readListFile(path.join(runDir, "left-out.txt"));
  const slicesYaml = readRawYamlEntry(path.join(runDir, "slices.yaml"));
  const reports = loadRunReports(runDir);
  const existingPaths = collectExistingFindingPaths(state.repoRoot, reports);
  const reviewFindingsForAudit = loadReviewFindingsForAudit(runDir, state.missedReports, reports);
  const gateLog = readGateLog(runDir);

  const result = advanceCycle(state, {
    spec,
    scope,
    leftOut,
    uncommitted: uncommittedRes.files,
    existingPaths,
    slicesYaml,
    reports,
    reviewFindingsForAudit,
    gateLog,
  });

  const applyRes = applyCycleEffects(result.state, result.effects);
  if (!applyRes.ok) {
    console.error(applyRes.error);
    return 2;
  }

  let finalAction = result.action;
  if (finalAction.action === "commit") {
    const listPaths = readListFile(finalAction.listFile);
    const statRes = getDiffStat(state.repoRoot, listPaths);
    if (!statRes.ok) {
      console.error(statRes.error);
      return 2;
    }
    finalAction = {
      ...finalAction,
      diffStat: statRes.stat,
    };
  }

  writeState(runDir, result.state);
  printYaml(finalAction);
  return 0;
};

const cmdCommit = (runDirArg: string, listFileArg: string, messageFileArg: string): number => {
  const runDir = path.resolve(runDirArg);
  const stateRes = readState(runDir);
  if (!stateRes.ok) {
    console.error(stateRes.error);
    return 2;
  }
  const state = stateRes.state;

  const listFile = fs.existsSync(path.resolve(listFileArg))
    ? path.resolve(listFileArg)
    : path.join(runDir, listFileArg);
  const messageFile = fs.existsSync(path.resolve(messageFileArg))
    ? path.resolve(messageFileArg)
    : path.join(runDir, messageFileArg);

  if (!fs.existsSync(listFile)) {
    console.error(`List file not found: ${listFile}`);
    return 2;
  }
  if (!fs.existsSync(messageFile)) {
    console.error(`Message file not found: ${messageFile}`);
    return 2;
  }

  const paths = readListFile(listFile);
  const commitRes = commitPaths(state.repoRoot, listFile, messageFile, paths);
  if (!commitRes.ok) {
    console.error(commitRes.error);
    return 2;
  }

  const listName = path.basename(listFile);
  if (!state.committedLists.includes(listName)) {
    state.committedLists.push(listName);
  }
  writeState(runDir, state);

  printYaml({
    committed: listName,
    summary: commitRes.summary,
  });
  return 0;
};

const program = new Command();
program.name("cycle-ctl").description("Deterministic state-machine CLI for /cycle").exitOverride();

program
  .command("init")
  .description("Initialise a /cycle run folder and state.json")
  .option("--spec <spec.yaml>", "Path to a building spec YAML file")
  .option("--mode <mode>", "Review mode (diff | full)", "diff")
  .option("--allow-partial", "Allow starting /cycle over an incomplete /go audit")
  .option(
    "--exclude <path>",
    "Repo-relative path to exclude from scope (repeatable)",
    collectRepeatable,
    [],
  )
  .option("--skill <dir>", "Path to skills/cycle directory")
  .action(
    (opts: {
      spec?: string;
      mode: string;
      allowPartial?: boolean;
      exclude: string[];
      skill?: string;
    }) => {
      process.exitCode = cmdInit(opts);
    },
  );

program
  .command("next")
  .description("Advance /cycle state and print the next YAML action")
  .argument("<run>", "Path to the /cycle run directory")
  .action((run: string) => {
    process.exitCode = cmdNext(run);
  });

program
  .command("commit")
  .description("Commit the paths in <list-file> with <message-file> and record it in state.json")
  .argument("<run>", "Path to the /cycle run directory")
  .argument("<list-file>", "Path to list file (e.g. scope.txt or fixed-1.txt)")
  .argument("<message-file>", "Path to commit message file")
  .action((run: string, listFile: string, messageFile: string) => {
    process.exitCode = cmdCommit(run, listFile, messageFile);
  });

registerContractCommands(program);

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
