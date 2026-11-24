import { Command } from "commander";
import { cmdFreeze, cmdRows } from "./commands/freeze-rows.ts";
import { cmdOpen, cmdResults, cmdSchema, cmdVerify } from "./commands/results-verify-open.ts";
import { cmdLock, cmdValidate } from "./commands/validate-lock.ts";

const program = new Command();
program.name("ledger").description("Oracle ledger CLI for /oracle");

program
  .command("freeze")
  .description("Freeze oracle.conf.json and the row script hash into frozen.json")
  .argument("<case>", "Path to the __oracle__ case directory")
  .requiredOption("--words <words>", "Scope words describing this oracle case")
  .action((caseArg: string, opts: { words: string }) => {
    process.exitCode = cmdFreeze(caseArg, opts.words);
  });

program
  .command("rows")
  .description("Run the row script and sync <slice>.oracle.yaml files")
  .argument("<case>", "Path to the __oracle__ case directory")
  .option("--draft", "Allow running before freeze or with drifted script", false)
  .action((caseArg: string, opts: { draft: boolean }) => {
    process.exitCode = cmdRows(caseArg, opts.draft);
  });

program
  .command("validate")
  .description("Validate oracle.conf.json and every *.oracle.yaml file")
  .argument("<case>", "Path to the __oracle__ case directory")
  .action((caseArg: string) => {
    process.exitCode = cmdValidate(caseArg);
  });

program
  .command("lock")
  .description("Validate and write SHA-256 row hashes to locked.json")
  .argument("<case>", "Path to the __oracle__ case directory")
  .action((caseArg: string) => {
    process.exitCode = cmdLock(caseArg);
  });

program
  .command("results")
  .description("Ingest JUnit XML results, cheat-lint tests, and update run-state/<slice>.json")
  .argument("<case>", "Path to the __oracle__ case directory")
  .argument("<junit...>", "One or more JUnit XML report files")
  .requiredOption("--tests <paths...>", "Test files or directories to resolve and lint")
  .option("--slice <slice>", "Limit result ingestion and checks to one slice")
  .action((caseArg: string, junitArgs: string[], opts: { tests: string[]; slice?: string }) => {
    process.exitCode = cmdResults(caseArg, junitArgs, opts.tests, opts.slice);
  });

program
  .command("verify")
  .description("Validate claims YAML against locked rows and bind test file hashes")
  .argument("<case>", "Path to the __oracle__ case directory")
  .argument("<claims>", "Path to claims YAML (e.g. claims.yaml or claims-<slice>.yaml)")
  .option("--slice <slice>", "Limit claim verification to one slice")
  .action((caseArg: string, claimsArg: string, opts: { slice?: string }) => {
    process.exitCode = cmdVerify(caseArg, claimsArg, opts.slice);
  });

program
  .command("open")
  .description("Report oracle status and exit 0 only when the case is fully closed")
  .argument("<case>", "Path to the __oracle__ case directory")
  .action((caseArg: string) => {
    process.exitCode = cmdOpen(caseArg);
  });

program
  .command("schema")
  .description("Emit JSON Schema for <slice>.oracle.yaml")
  .option("--out <path>", "Write schema to a file instead of stdout")
  .action((opts: { out?: string }) => {
    process.exitCode = cmdSchema(opts.out);
  });

program.parse(process.argv);
