## Extend the base oxlint and oxfmt configs

**Tooling:** Every TypeScript repo carries `.oxlintrc.json` and `.oxfmtrc.json` preserving all base settings and values; repos may add rules, `ignorePatterns`, and `internalPattern` aliases, never contradict the base.

**When:** Every TypeScript repo (base files live at `configs/oxlintrc.json` and `configs/oxfmtrc.json` in Plumb).

Bad: Turning a base rule off in `.oxlintrc.json`.
Good: Keeping all base rules and adding two repo-specific ones.

Links: [oxlintrc.json](https://github.com/maxanstey-meridian/plumb/blob/main/configs/oxlintrc.json), [oxfmtrc.json](https://github.com/maxanstey-meridian/plumb/blob/main/configs/oxfmtrc.json)
