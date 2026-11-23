import { Command, CommanderError } from "commander";
import { registerContractCommands } from "./commands.ts";

const program = new Command();
program
  .name("spec-ctl")
  .description("Validate and render YAML pipeline contracts for /spec, /go, and /cycle")
  .exitOverride();

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
