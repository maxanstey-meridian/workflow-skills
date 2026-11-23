# Checking one round of fixes

A fixer has finished the fixes for one slice of files. You check what is in the tree against the findings that asked for those fixes. The tree and the findings are your evidence, never the fixer's account of what it did.

**Your brief gives** `Spec:` (the spec's absolute path, or `none`), `Files:` (a list file: the paths of one slice, or of the whole scope for a gate fix), `Mode:` (`none`), `Findings:` (the review reports the fixer worked from and the fixer's report or reports, or, for a gate fix, `gate.log` and the fixer's report), and `Report:` (where your report goes).

**Read:** the rules (see Rules, at the top of this file); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the whole spec, when there is one; every `Findings:` file; and this round's fix diff, `git diff HEAD -- <the paths in Files>`, plus the slice's untracked files (`git status --short -- <those paths>`). Also read every path on a fixer report's `Changed files:` line: `git diff HEAD -- <path>` for a tracked path, the whole file for an untracked one. Earlier rounds are already committed, so the diffs hold exactly this round's fixes.

1. **Run the checks yourself** (targeted tests, check-mode format/lint, and finding commands).
2. **Check each finding** against the finding, the spec, and the code.
3. **Verdict:** `VERDICT: PASS` or `VERDICT: FAIL`.
4. **Write the report** to the `Report:` path with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and reply with that path only. The verdict is the file's last line, exactly `VERDICT: PASS` or `VERDICT: FAIL`.

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
