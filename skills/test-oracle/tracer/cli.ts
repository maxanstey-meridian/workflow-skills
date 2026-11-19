type Result = { exit: number; out: string };

const names = ["mango", "apple", "cherry"];
const formats = ["text", "json"];

export const run = (argv: string[]): Result => {
  const [command, ...rest] = argv;

  if (command === "greet") {
    const [person] = rest;
    if (person === undefined) {
      return { exit: 2, out: "usage: greet <name>" };
    }
    return { exit: 0, out: `Hello, ${person}!` };
  }

  if (command === "list") {
    const flag = rest.indexOf("--format");
    const format = flag === -1 ? undefined : rest[flag + 1];
    if (format === undefined || !formats.includes(format)) {
      throw new Error(`undeclared --format value: ${format}`);
    }
    if (format === "json") {
      return { exit: 0, out: JSON.stringify(names) };
    }
    return { exit: 0, out: names.join("\n") };
  }

  throw new Error(`undeclared command: ${command}`);
};

if (import.meta.main) {
  const result = run(process.argv.slice(2));
  console.log(result.out);
  process.exitCode = result.exit;
}
