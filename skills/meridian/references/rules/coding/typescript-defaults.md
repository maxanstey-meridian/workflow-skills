## TypeScript Defaults

Treat TypeScript as a design tool.

Defaults:

- prefer `const` functions
- strict typing
- explicit state modelling
- fix the type or the code, not the symptom

Avoid:

- `any` as convenience
- type assertions and non-null assertions (a law; see `coding/type-safety-all-stacks.md`)
- optional-chaining away modelling problems
- nullish-coalescing away unclear state

Where runtime DI identity is needed, prefer abstract-class tokens with interface-like shape.
