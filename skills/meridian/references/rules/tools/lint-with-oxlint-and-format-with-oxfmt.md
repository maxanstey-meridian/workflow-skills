## Lint with oxlint and format with oxfmt

**Tooling:** Use `oxlint` rather than `eslint`, and `oxfmt` rather than Prettier, for all JavaScript and TypeScript linting and formatting.

**When:** Every JavaScript or TypeScript repo.

Bad: `"lint": "eslint . && prettier --check ."`
Good: `"lint": "oxlint && oxfmt --check"`
