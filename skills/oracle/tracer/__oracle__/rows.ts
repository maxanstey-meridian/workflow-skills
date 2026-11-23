import { ACTIONS, STATUSES } from "../ticket.ts";

for (const status of STATUSES) {
  for (const action of ACTIONS) {
    const row = {
      id: `${status}_${action}`,
      slice: "lifecycle",
      where: "../ticket.ts",
    };
    process.stdout.write(`${JSON.stringify(row)}\n`);
  }
}
