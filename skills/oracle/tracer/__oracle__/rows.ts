const rows = [
  { id: "greet_name", slice: "cli", where: "../cli.ts" },
  { id: "greet_missing", slice: "cli", where: "../cli.ts" },
  { id: "list_json", slice: "cli", where: "../cli.ts" },
  { id: "list_text", slice: "cli", where: "../cli.ts" },
];

for (const row of rows) {
  process.stdout.write(`${JSON.stringify(row)}\n`);
}
