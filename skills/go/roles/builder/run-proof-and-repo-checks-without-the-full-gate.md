## Run Proof and repo checks without the full gate

**Law:** Run the piece's Proof, the targeted tests for changed files, format and lint as named by the repo's instructions or root `Taskfile.yml` (`task --list-all` prints them), and any build or generation command when you changed a source file the repo generates other files from; never run the full gate or mutation.

**When:** Verifying a built piece before reporting; run each format or lint command as it is, record any file it rewrote outside `owns` under `changed`, and record a check under `notRun` when neither the repo's instructions nor its `Taskfile.yml` has a command for it.

Bad: Running `task gate` or Stryker mutation from a builder, or skipping `node lib/build-roles/src/cli.ts` after editing a role part.
Good: Running the piece's Proof, targeted tests, the build/generation command, and format/lint if defined (recording `check: lint` under `notRun` when neither instructions nor `Taskfile.yml` defines one).
