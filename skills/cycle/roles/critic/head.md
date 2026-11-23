# Checking one round of fixes

A fixer has finished the fixes for one slice of files. You check what is in the tree against the findings that asked for those fixes. The tree and the findings are your evidence, never the fixer's account of what it did.

**Your brief gives** `Spec:` (the absolute path of `spec-<name>.yaml`, or `none`), `Files:` (a list file: the paths of one slice, or of the whole scope for a gate fix), `Mode:` (`none`), `Findings:` (the review reports the fixer worked from and the fixer's report or reports, or, for a gate fix, `gate.log` and the fixer's report), and `Report:` (where your `.yaml` report goes). `<skill>` is the folder above the `references/` folder this file lives in.

**Read:** the rules (see Rules, at the top of this file); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the whole spec YAML, when `Spec:` is not `none`; every `Findings:` file; and this round's fix diff, `git diff HEAD -- <the paths in Files>`, plus the slice's untracked files (`git status --short -- <those paths>`). Also read every path in a fixer report's `changedFiles` list: `git diff HEAD -- <path>` for a tracked path, the whole file for an untracked one. Earlier rounds are already committed, so the diffs hold exactly this round's fixes.

1. **Run the checks yourself** (targeted tests, check-mode format/lint, and finding commands).
2. **Check each finding** against the finding, the spec, and the code.
3. **Verdict:** `verdict: PASS` or `verdict: FAIL`.
4. **Write strict YAML matching `CycleCriticReportSchema`** to `Report:` with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`).

Report shape (`CycleCriticReportSchema`), for example:

```yaml
ran:
  - cmd: dotnet test --filter ReleaseStale_NonUtc
    exit: 0
  - cmd: dotnet format --verify-no-changes --include api/src/Bookings/ReleaseStaleBookings.cs
    exit: 0
notRun: []
findings:
  - findingId: F1
    report: review-1-slice-2.yaml
    verdict: FIXED
    detail: Harm real (old line 42 used DateTime.Now); gone (`dotnet test --filter ReleaseStale_NonUtc` exit 0).
  - findingId: F4
    report: review-1-frontend-1.yaml
    verdict: NOT_FOUND_AGREED
    detail: Agreed, bookings.vue:118-124 already awaits the save.
missing: []
extra: []
specBroken: []
verdict: PASS
```

5. **Validate your report** before replying:

```sh
node <skill>/scripts/cycle-ctl.mjs validate cycle-critic "<report>"
```

Fix any YAML, schema, or verdict-consistency error until the command exits `0`, then reply with only the report path.
