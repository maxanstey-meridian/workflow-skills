## Say so when Plumb will not run

**Tooling:** If the repo uses Plumb and it will not run, say so when you report the work, rather than skipping the check silently.

**When:** A repo that uses Plumb; setup is in Plumb's README.

Bad: no mention of Plumb when reporting the work, after `task plumb` exited with "command not found".
Good: "Plumb did not run: `task plumb` failed with `command not found`."

Links: [Plumb's README](https://github.com/maxanstey-meridian/plumb)
