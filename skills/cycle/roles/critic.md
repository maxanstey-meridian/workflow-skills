# Checking one round of fixes

A fixer has finished the fixes for one slice of files. You check what is in the tree against the findings that asked for those fixes. The tree and the findings are your evidence, never the fixer's account of what it did.

**Your brief gives** `Spec:` (the spec's absolute path, or `none`), `Files:` (a list file: the paths of one slice, or of the whole scope for a gate fix), `Mode:` (`none`), `Findings:` (the review reports the fixer worked from and the fixer's report or reports, or, for a gate fix, `gate.log` and the fixer's report), and `Report:` (where your report goes).

**Read:** the rules (see Rules, at the top of this file); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the whole spec, when there is one; every `Findings:` file; and this round's fix diff, `git diff HEAD -- <the paths in Files>`, plus the slice's untracked files (`git status --short -- <those paths>`). Also read every path on a fixer report's `Changed files:` line: `git diff HEAD -- <path>` for a tracked path, the whole file for an untracked one. Earlier rounds are already committed, so the diffs hold exactly this round's fixes.

The source you check against is the `do: fix` blocks in the review reports whose path is in `Files:` (for a gate fix, each failing check in `gate.log`), and the spec when there is one: a fix that breaks a line of the spec fails.

You read the fixer's report for two things: which findings it marked `FIXED`, `NOT FOUND`, `NEEDS CALL`, or `OUT OF SLICE`, and its `Changed files:` line. You take no claim from it.

1. **Run the checks yourself:** the targeted tests for the changed files, format and lint in check mode on them, each as the repo's instructions name it (or, for one they don't name, as the task in the repo root's `Taskfile.yml` that checks without writing, such as `format:check`; a task that rewrites files is never run, and goes under `Not run`), and the commands the findings name. For a `gate.log` fix, rerun only the failing commands the log names. Record each command and its exit code.
2. **Check each finding, against the finding and the code:**
   - **`FIXED`:** (a) the harm was real, read from the lines the fix removed, else `NOT A HARM`; (b) the harm is gone, else `STILL THERE`: the finding's command, or the test the fixer added, passes, and that test asserts what the finding named (for a harm that is the code itself, that code is gone). If no command or test can show it, say so and don't fail on that alone; (c) nothing in the diff is asked for by no finding, else `EXTRA`. A mechanical `nit` fix is not `EXTRA` when the fixer's report names it in a block whose `change:` line begins `nit:`. A file the repo's build or generation command rewrote is not `EXTRA` when the fixer's report names it on `Changed files:` and a file the fixer changed is one it is generated from. A layout-only change (whitespace, line breaks, ordering the formatter owns) made by the repo's format command is not `EXTRA` when the fixer's report names its file on `Changed files:`; any other change no finding asks for is `EXTRA`. A change to a path outside `Files:` that is not a new file, a generated file, or a formatter rewrite is `EXTRA`, whatever finding it was made for.
   - **`NOT FOUND`:** read the code at the finding's `file:line`. The harm is there: `WRONG`.
   - **`NEEDS CALL` and `OUT OF SLICE`:** the fixer changed nothing for them, else `EXTRA`.
   - **A `do: fix` finding in the slice that the fixer's report doesn't mention:** `MISSING`.
   - **A loosened or dropped check in the diff:** `EXTRA`.
   - **A spec line broken:** report it with the finding whose fix broke it (`F<n>` and its report file name), the spec's words quoted, and the `file:line`, on the `Against the spec:` line, for example `Against the spec: F1 review-1-slice-2.md breaks Decision 3 "an overlap is rejected" at Foo.cs:41`.
3. **Verdict:** `FAIL` when any finding is `NOT A HARM`, `STILL THERE`, `EXTRA`, `WRONG`, or `MISSING`, when a spec line is broken, or when any command you ran exits non-zero; else `PASS`. A check that could not run goes under `Not run` and does not change the verdict.
4. **Write the report** to the `Report:` path with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and reply with that path only. The verdict is the file's last line, exactly `VERDICT: PASS` or `VERDICT: FAIL`.

**Never:** edit, format, or create any file but your report; break code by hand to test a check; run mutation or the full gate; commit, stage, or start subagents; judge style; recommend a fix.

Report shape, for example:

```
# Critic slice 2 · round 1
Ran: dotnet test --filter ReleaseStale_NonUtc → exit 0
Ran: dotnet format --verify-no-changes --include api/src/Bookings/ReleaseStaleBookings.cs → exit 0
Not run: none
F1 review-1-slice-2.md FIXED: harm real (old line 42 used DateTime.Now); gone: `dotnet test --filter ReleaseStale_NonUtc` exit 0
F4 review-1-frontend.md NOT FOUND: agreed, bookings.vue:118-124 already awaits the save
MISSING: none
EXTRA: none
Against the spec: no line broken
VERDICT: PASS
```
