## Treat generated output as read-only and unlinted

**Tooling:** Generated output is never edited by hand and is excluded from every linter that could reach it.

**When:** Any generated tree in a TypeScript repo: the nearest `.oxlintrc.json` lists it in `ignorePatterns`, and an ESLint flat config that applies to it has a matching `ignores` entry.

Bad: `packages/contracts/generated/schema.d.ts` edited by hand to fix a lint error.
Good: `packages/contracts/generated` added to `ignorePatterns`, and `schema.d.ts` regenerated rather than edited.
