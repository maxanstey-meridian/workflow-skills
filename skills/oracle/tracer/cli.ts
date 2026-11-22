const ITEMS = ["mango", "apple", "cherry"] as const;

export type CliResult = {
  exit: number;
  out: string;
};

export const run = (argv: string[]): CliResult => {
  const [command, ...rest] = argv;

  if (command === "greet") {
    const name = rest[0];
    if (name === undefined || name.trim().length === 0) {
      return { exit: 2, out: "usage: greet <name>" };
    }
    return { exit: 0, out: `Hello, ${name}!` };
  }

  if (command === "list") {
    if (rest[0] !== "--format" || rest[1] === undefined) {
      return { exit: 2, out: "usage: list --format <json|text>" };
    }
    const format = rest[1];
    if (format === "json") {
      const sorted = [...ITEMS].sort();
      return { exit: 0, out: JSON.stringify(sorted) };
    }
    if (format === "text") {
      // Deliberate defect for the oracle shortfall proof: unsorted output.
      return { exit: 0, out: ITEMS.join("\n") };
    }
    return { exit: 2, out: `invalid --format: ${format}` };
  }

  return { exit: 2, out: `unknown command: ${command ?? "(none)"}` };
};
