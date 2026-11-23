import path from "node:path";
import { buildRoles } from "./build-roles.ts";

const repoDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(import.meta.dirname, "../../..");

const result = buildRoles(repoDir);

for (const warning of result.warnings) {
  process.stderr.write(`${warning}\n`);
}
for (const error of result.errors) {
  process.stderr.write(`${error}\n`);
}

process.exit(result.exitCode);
