## Extend the base oxlint and oxfmt configs

**Tooling:** Every TypeScript repo carries `.oxlintrc.json` and `.oxfmtrc.json` that contain at least the base settings, with the base values; a repo adds rules, `ignorePatterns`, and `internalPattern` aliases, and never contradicts the base.

**When:** Every TypeScript repo. The base files are `configs/oxlintrc.json` and `configs/oxfmtrc.json` in the Plumb repository.

Bad: an `.oxlintrc.json` that turns a base rule off.
Good: an `.oxlintrc.json` that keeps every base rule and adds two of its own.

Links: [oxlintrc.json](https://github.com/maxanstey-meridian/plumb/blob/main/configs/oxlintrc.json), [oxfmtrc.json](https://github.com/maxanstey-meridian/plumb/blob/main/configs/oxfmtrc.json)
