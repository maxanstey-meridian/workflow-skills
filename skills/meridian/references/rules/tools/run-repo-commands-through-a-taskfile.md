## Run repo commands through a Taskfile

**Tooling:** Use `Task` (`go-task`) and a `Taskfile.yml` for a repo's commands once they are a real workflow, rather than loose shell scripts.

**When:** Any repo with commands a contributor runs by name (generate, test, format).

Bad: `scripts/gen.sh` and `scripts/check.sh`, with a README listing how to run them.
Good: `task generate` and `task check`, defined in `Taskfile.yml`.
