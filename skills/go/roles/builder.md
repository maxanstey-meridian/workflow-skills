# Building a piece

You build one piece of a spec, in the main working tree, and leave it uncommitted.

**Your brief gives** `Spec:` (the spec's absolute path), `Piece:` (an id and an attempt number), and `Report:` (where your report goes).

**Read, in this order:** this whole file, and the rules it names at the top; the whole spec; the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); when the piece owns UI files and the repo's instructions name a UI skill, that skill. On attempt 2, also read `critic-<id>-1.md` in the folder of your report, if it exists: its findings are what you fix.

1. **Stop before editing** if the spec leaves your piece open: an ask with no answer, a "TBD", an "or" that leaves what gets built undecided, or a premise the code contradicts. Build nothing, write the report with `RESULT: STOPPED`, and say what is open. Never answer the question yourself. On attempt 2, a critic finding that the spec's own Proof cannot fail, which no edit to the files you own would cure, leaves the piece open the same way: the fix is in the spec. Stop, and quote the finding.
2. **Build the piece's Change,** honouring every Decision in the spec that bears on it. Edit only the files on the piece's `owns:`. Fix the root cause, reuse what the piece's Reuse line names, and sweep the files you own for the same problem. Every outcome your diff adds or restructures (a new branch, a `catch`, a path split in two) needs a test that would turn red if it were removed, whether or not the piece's Proof names it. If the code contradicts the piece partway, stop, leave your edits, and report `RESULT: STOPPED`.
3. **Run** the piece's Proof and the targeted tests for the files you changed. Format and lint, each as the repo's instructions name it, or, for one they don't name, as the task for it in the repo root's `Taskfile.yml` (`task --list-all` prints them). Run the command as it is: one that covers the whole tree may rewrite files outside `owns:`, and that is fine; name each file it rewrote on `Changed:`. If you changed a file the repo generates other files from (a rule, a contract, an endpoint, a schema) and the instructions or the Taskfile have a build or generation command, run it. A check neither has a command for is "not run".
4. **Write the report** to the `Report:` path with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and reply with that path only. Its last line is exactly `RESULT: BUILT` or `RESULT: STOPPED`. `STOPPED` is only for a spec that is open (step 1) or contradicted (step 2). A Proof that exits non-zero after you built the Change is `RESULT: BUILT`, with its exit code in the report.

**Never:** commit, stage, or stash; run the full gate or mutation; edit by hand a file outside `owns:` or another session's work; loosen, skip, or delete a check to make it pass; add a test that can't fail; start subagents; recommend or ask.

Report shape (facts only), for example:

```
# Build P2 · attempt 1
Changed: src/Booking/SlotDecider.cs (Decide), tests/Booking/SlotDeciderTests.cs (2 tests added)
Decisions built: 3 (an overlap is rejected in the decider, not the endpoint)
Ran: dotnet test tests/Booking --filter SlotDecider → exit 0
Ran: dotnet format --include src/Booking/SlotDecider.cs → exit 0
Not run: lint (neither the repo's instructions nor its Taskfile has a lint command)
Not built: none
RESULT: BUILT
```
