## Run Plumb only where the repo uses it

**Tooling:** Run Plumb, the checker for these rules, only when the repo's instructions name it or the repo defines a Plumb task or script; otherwise skip it without reporting it as unavailable.

**When:** After completing changes in any repo. Run the repo's own task (for example `task plumb`) when it has one, since that applies the repo's baseline; otherwise run it as the repo's instructions say, or from a local checkout of Plumb: `<plumb-checkout>/plumb . --json`.

Bad: "Plumb is not installed, skipping" said when reporting work on a repo that never mentions Plumb.
Good: nothing said about Plumb when reporting work on a repo that never mentions it.

Links: [Plumb](https://github.com/maxanstey-meridian/plumb)
