## Treat generated output as read-only and unlinted

**Tooling:** Never edit generated output by hand and exclude it from every linter.

**When:** Generated trees in TypeScript repos: list them in `.oxlintrc.json` `ignorePatterns` and matching ESLint flat-config `ignores`.

Bad: Editing `packages/contracts/generated/schema.d.ts` by hand to fix a lint error.
Good: Adding `packages/contracts/generated` to `ignorePatterns` and regenerating `schema.d.ts`.
