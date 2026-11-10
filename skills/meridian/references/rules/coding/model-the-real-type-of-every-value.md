## Model the real type of every value

**Default:** Give every value its real type: never `any`, `object`, `object?`, or `dynamic`, and `unknown` only at a boundary until the value is parsed.

**When:** C# and TypeScript. A value that can be a string, a boolean, or a number is a discriminated union (one type with a tag field that says which case it is).

Bad: `value: any` (or `object?`) for a field answer.
Good: `type Answer = { kind: "text"; value: string } | { kind: "flag"; value: boolean }`.
