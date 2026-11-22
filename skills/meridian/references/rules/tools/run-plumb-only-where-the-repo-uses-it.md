## Run Plumb only where the repo uses it

**Tooling:** Run Plumb only when the repo's instructions name it or define a Plumb task/script; otherwise skip it silently.

**When:** After completing changes in any repo. Prefer the repo's task (e.g., `task plumb`) so its baseline applies; otherwise follow repo instructions or run `<plumb-checkout>/plumb . --json`.

Bad: Reporting "Plumb is not installed, skipping" on a repo that never mentions Plumb.
Good: Saying nothing about Plumb on a repo that does not use it.

Links: [Plumb](https://github.com/maxanstey-meridian/plumb)
