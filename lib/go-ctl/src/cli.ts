import { Command, CommanderError } from "commander";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { registerContractCommands } from "../../contracts/src/commands.ts";
import { captureGitStatus, ensurePlansIgnored, resolveMainDir } from "./git.ts";
import {
  archiveExistingRunDir,
  loadReportsOnDisk,
  readSpecFile,
  readStateFile,
  writeSpecFile,
  writeStateFile,
  writeTextFile,
} from "./io.ts";
import type { GoAction, GoState } from "./state.ts";
import { advanceGo } from "./transition.ts";

const DEFAULT_SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const printYaml = (value: unknown): void => {
  process.stdout.write(YAML.stringify(value, { lineWidth: 0 }));
};

const cmdInit = (rawSpec: string, opts: { skill?: string }): number => {
  const mainResult = resolveMainDir(process.cwd());
  if (!mainResult.ok) {
    console.error(mainResult.error);
    return 2;
  }
  const mainDir = mainResult.mainDir;

  const specPath = path.isAbsolute(rawSpec)
    ? path.normalize(rawSpec)
    : path.resolve(mainDir, rawSpec);
  const skillDir = opts.skill !== undefined ? path.resolve(opts.skill) : DEFAULT_SKILL_DIR;

  const specResult = readSpecFile(specPath);
  if (!specResult.ok) {
    if (specResult.kind === "io") {
      console.error(specResult.error);
      return 2;
    }
    const stopAction: GoAction = {
      action: "stop",
      reason: `Spec validation failed for ${specPath}`,
      details: specResult.details,
    };
    printYaml(stopAction);
    return 0;
  }

  const spec = specResult.spec;

  if (spec.status === "draft" || spec.openAsks.length > 0) {
    const stopAction: GoAction = {
      action: "stop",
      reason:
        spec.status === "draft"
          ? 'Spec status is "draft" with unanswered open asks.'
          : "Spec has unanswered open asks.",
      openAsks: spec.openAsks,
    };
    printYaml(stopAction);
    return 0;
  }

  if (spec.status === "built") {
    const stopAction: GoAction = {
      action: "stop",
      reason: 'Spec status is already "built".',
    };
    printYaml(stopAction);
    return 0;
  }

  const ignoreResult = ensurePlansIgnored(mainDir);
  if (!ignoreResult.ok) {
    console.error(ignoreResult.error);
    return 2;
  }

  const statusResult = captureGitStatus(process.cwd());
  if (!statusResult.ok) {
    console.error(statusResult.error);
    return 2;
  }

  if (spec.status === "agreed") {
    writeSpecFile(specPath, { ...spec, status: "building" });
  }

  const specBase = path.basename(specPath).replace(/\.ya?ml$/i, "");
  const runDir = path.join(mainDir, ".plans", "scratch", specBase, "go");

  archiveExistingRunDir(runDir);
  fs.mkdirSync(runDir, { recursive: true });
  writeTextFile(path.join(runDir, "status-before.txt"), statusResult.status);

  const initialState: GoState = {
    specPath,
    mainDir,
    skillDir,
    runDir,
    phase: { kind: "idle" },
    failedPieces: [],
    retries: {},
  };
  writeStateFile(runDir, initialState);

  printYaml({ run: runDir });
  return 0;
};

const cmdNext = (rawRun: string): number => {
  const runDir = path.resolve(rawRun);

  const stateResult = readStateFile(runDir);
  if (!stateResult.ok) {
    console.error(stateResult.error);
    return 2;
  }
  const state = stateResult.state;

  const specResult = readSpecFile(state.specPath);
  if (!specResult.ok) {
    const message =
      specResult.kind === "io"
        ? specResult.error
        : `Invalid spec at ${state.specPath}: ${specResult.details.join("; ")}`;
    console.error(message);
    return 2;
  }
  const spec = specResult.spec;

  const reportsResult = loadReportsOnDisk(runDir);
  if (!reportsResult.ok) {
    console.error(reportsResult.error);
    return 2;
  }

  const result = advanceGo(state, spec, reportsResult.reports);

  if (result.specBuiltPieces !== undefined) {
    writeSpecFile(state.specPath, { ...spec, builtPieces: result.specBuiltPieces });
  }

  if (result.renderedReportMd !== undefined) {
    writeTextFile(path.join(runDir, "report.md"), result.renderedReportMd);
  }

  writeStateFile(runDir, result.state);
  printYaml(result.action);
  return 0;
};

const program = new Command();
program.name("go-ctl").description("Deterministic state-machine CLI for /go").exitOverride();

program
  .command("init")
  .description("Validate a spec, transition agreed -> building, and initialize a /go run directory")
  .argument("<spec>", "Path to spec YAML (relative paths resolve against <main>)")
  .option("--skill <dir>", "Path to skills/go directory (defaults to parent of scripts/)")
  .action((spec: string, opts: { skill?: string }) => {
    process.exitCode = cmdInit(spec, opts);
  });

program
  .command("next")
  .description("Validate completed reports on disk, advance /go state, and emit the next action")
  .argument("<run>", "Path to the /go run directory")
  .action((run: string) => {
    process.exitCode = cmdNext(run);
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
