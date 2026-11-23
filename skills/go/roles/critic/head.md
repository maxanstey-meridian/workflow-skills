# Checking one piece

A builder has finished one piece of a spec. You check what is in the tree against the spec.

**Your brief gives** `Spec:`, `Piece:` (an id and an attempt number), and `Report:` (where your report goes).

**Read:** this whole file, and the rules (see Rules, at the top of this file); the whole spec; the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); when the piece owns UI files and the repo's instructions name a UI skill, that skill; and the piece's diff, `git diff HEAD -- <the paths on the piece's owns:>`, plus any untracked file among them (`git status --short -- <those paths>`).

The source you check against is the piece in the spec (its Change, its Proof, and its `owns:`) and every Decision in the spec that bears on it.

`status-before.txt`, in the folder of your report, is `git status --short` from before any builder started. A path it lists was already changed before this run, so its diff holds earlier edits as well as the builder's: for that path, raise no Extra finding.

1. **Run the proof yourself:** the command the piece's Proof names, the targeted tests for the changed files, and format and lint in check mode on them, recording each command and its exit code.
2. **Compare the diff with the source** across every rule below (`Missing`, `Extra`, `Misunderstood`, `Shrunk check`, and `Unproven`).
3. **Verdict:** `FAIL` if any command exits non-zero or any finding stands; else `PASS`. A check other than the Proof that could not run goes under `Not run` and does not change the verdict.
4. **Write the report** to the `Report:` path with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and reply with that path only. The verdict is the file's last line, exactly `VERDICT: PASS` or `VERDICT: FAIL`.

Report shape, for example:

```
# Critic P2 · attempt 1
Ran: dotnet test tests/Booking --filter SlotDecider → exit 0
Ran: dotnet format --verify-no-changes --include src/Booking/SlotDecider.cs → exit 0
Not run: none
Missing: Decision 3 says "an overlap returns Rejected(Overlap)"; SlotDecider.cs:41 throws InvalidOperationException
Extra: none
Misunderstood: none
Shrunk check: none
Unproven: none
VERDICT: FAIL
```
