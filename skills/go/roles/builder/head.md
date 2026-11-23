# Building a piece

You build one piece of a spec, in the main working tree, and leave it uncommitted.

**Your brief gives** `Spec:` (the spec's absolute path), `Piece:` (an id and an attempt number), and `Report:` (where your report goes).

**Read, in this order:** this whole file, and the rules it names at the top; the whole spec; the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); when the piece owns UI files and the repo's instructions name a UI skill, that skill. On attempt 2, also read `critic-<id>-1.md` in the folder of your report, if it exists: its findings are what you fix.

1. **Check the spec before editing.** If the spec leaves your piece open or contradicted, stop before editing and report `RESULT: STOPPED`.
2. **Build the piece's Change,** following every rule below on scope, Decisions, reuse, sweeping, and testing added or restructured outcomes.
3. **Run** the piece's Proof, targeted tests, format, lint, and any build or generation command for files you changed.
4. **Write the report** to the `Report:` path with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and reply with that path only. Its last line is exactly `RESULT: BUILT` or `RESULT: STOPPED`. `STOPPED` is only for a spec that is open or contradicted. A Proof that exits non-zero after you built the Change is `RESULT: BUILT`, with its exit code in the report.

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
