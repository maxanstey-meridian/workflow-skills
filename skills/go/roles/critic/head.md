# Checking one piece

A builder has finished one piece of a spec. You check what is in the tree against the spec.

**Your brief gives** `Spec:` (the absolute path of `spec-<name>.yaml`), `Piece:` (an id and an attempt number), and `Report:` (where your `.yaml` report goes). `<skill>` is the folder above the `references/` folder this file lives in.

**Read:** this whole file, and the rules (see Rules, at the top of this file); the whole spec YAML; the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); when the piece owns UI files and the repo's instructions name a UI skill, that skill; and the piece's diff, `git diff HEAD -- <the paths on the piece's owns>`, plus any untracked file among them (`git status --short -- <those paths>`). On attempt 2, also read `critic-<id>-1.yaml` in the folder of your report, if it exists.

The source you check against is the piece in the spec (its `change`, its `proof`, and its `owns`) and every Decision in the spec that bears on it.

`status-before.txt`, in the folder of your report, is `git status --short` from before any builder started. A path it lists was already changed before this run, so its diff holds earlier edits as well as the builder's: for that path, raise no Extra finding.

1. **Run the proof yourself:** the command the piece's Proof names, the targeted tests for the changed files, and format and lint in check mode on them, recording each command and its exit code in `ran`.
2. **Compare the diff with the source** across every rule below (`missing`, `extra`, `misunderstood`, `shrunkCheck`, and `unproven`). On attempt 2 (when `critic-<id>-1.yaml` exists), check that every finding from `critic-<id>-1.yaml` is resolved in the tree and that attempt 2 introduced no new `missing`, `extra`, `misunderstood`, or `shrunkCheck` defect — do not re-sweep untouched attempt-1 code for new `unproven` branches (deeper test-gap and mutation checks belong to `/cycle`).
3. **Verdict:** `FAIL` if any command in `ran` exits non-zero or any finding stands; else `PASS`. A check other than the Proof that could not run goes under `notRun` and does not change the verdict.
4. **Write the report** to the `Report:` path as strict YAML matching the schema below (do not inspect `go-ctl.mjs`) with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`).

Report schema:

<!-- schema: GoCriticReportSchema -->

An example of a saved `critic-P2-1.yaml` file:

```yaml
piece: P2
attempt: 1
ran:
  - cmd: dotnet test tests/Booking --filter SlotDecider
    exit: 0
  - cmd: dotnet format --verify-no-changes --include src/Booking/SlotDecider.cs
    exit: 0
notRun: []
missing:
  - 'Decision D3 says "an overlap returns Rejected(Overlap)"; SlotDecider.cs:41 throws InvalidOperationException'
extra: []
misunderstood: []
shrunkCheck: []
unproven: []
verdict: FAIL
```

5. **Validate your report** before replying:

```sh
node <skill>/scripts/go-ctl.mjs validate go-critic "<report>"
```

Fix any YAML, schema, or verdict-consistency error until the command exits `0`.

6. **Reply with only the path** of your report file.
