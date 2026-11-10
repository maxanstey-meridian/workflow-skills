## Fail a build only for a broken Law

**Default:** A mechanical check fails a build only for a Law (a rule whose violation is a bug) or a correctness constraint it can prove; for a Default (the preferred choice, replaced when a local constraint clearly points elsewhere) it warns, for a Preference (house consistency, no architectural claim) it informs, and a Tooling rule (a replaceable implementation choice) stays easy to change.

**When:** Configuring or writing a linter, analyser, architecture test, or CI check that enforces one of these rules.

Bad: A file-name suffix check (a Preference) set to `error`, so CI fails on a `.service.ts` file.
Good: The same check set to `info`, with the module-boundary check (a Law) left at `error`.
