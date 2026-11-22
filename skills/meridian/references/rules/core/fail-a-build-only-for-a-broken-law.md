## Fail a build only for a broken Law

**Default:** Fail builds only for a Law or mechanically provable correctness constraint; warn on Defaults, inform on Preferences, and keep Tooling rules easy to change.

**When:** Configuring linters, analysers, architecture tests, or CI checks enforcing these rules.

Bad: Setting a file-name suffix check (Preference) to `error` so CI fails on `.service.ts`.
Good: Setting that check to `info` and leaving the module-boundary check (Law) at `error`.
