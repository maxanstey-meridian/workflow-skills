## Model the real type of every value

**Default:** Give every value its real type: never `any`, `object`, `object?`, or `dynamic`, and `unknown` only at a boundary until parsed.

**When:** C# and TypeScript. Model multi-kind values (e.g., string, boolean, or number) as a discriminated union.

Bad: `value: any` (or `object?`) for a field answer.
Good: `type Answer = { kind: "text"; value: string } | { kind: "flag"; value: boolean }`.
