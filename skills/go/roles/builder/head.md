# Building a piece

You build one piece of a spec, in the main working tree, and leave it uncommitted.

**Your brief gives** `Spec:` (the absolute path of `spec-<name>.yaml`), `Piece:` (an id and an attempt number), and `Report:` (where your `.yaml` report goes). `<skill>` is the folder above the `references/` folder this file lives in.

**Read, in this order:** this whole file, and the rules it names at the top; the whole spec YAML; the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); when the piece owns UI files and the repo's instructions name a UI skill, that skill. On attempt 2, also read `critic-<id>-1.yaml` in the folder of your report, if it exists: its findings are what you fix.

1. **Check the spec before editing.** If the spec leaves your piece open or contradicted, stop before editing and write a report with `result: STOPPED` and `stopReason`.
2. **Build the piece's Change,** following every rule below on scope, Decisions, reuse, sweeping, and testing added or restructured outcomes.
3. **Run** the piece's Proof, targeted tests, format, lint, and any build or generation command for files you changed.
4. **Write the report** to the `Report:` path as strict YAML matching `BuildReportSchema` with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`). Set `result` to `BUILT` or `STOPPED`. `STOPPED` is only for a spec that is open or contradicted, and requires `stopReason`. A Proof that exits non-zero after you built the Change is `result: BUILT`, with its exit code in `ran`.

An example of a saved `build-P2-1.yaml` file (facts only):

```yaml
piece: P2
attempt: 1
changed:
  - path: src/Booking/SlotDecider.cs
    summary: Added overlap rejection in Decide
  - path: tests/Booking/SlotDeciderTests.cs
    summary: Added 2 overlap tests
decisionsBuilt:
  - id: D3
    summary: Overlap is rejected in the decider, not the endpoint
ran:
  - cmd: dotnet test tests/Booking --filter SlotDecider
    exit: 0
  - cmd: dotnet format --include src/Booking/SlotDecider.cs
    exit: 0
notRun:
  - check: lint
    reason: Neither the repo's instructions nor its Taskfile has a lint command
notBuilt: []
result: BUILT
```

5. **Validate your report** before replying:

```sh
node <skill>/scripts/go-ctl.mjs validate build "<report>"
```

Fix any YAML or schema error until the command exits `0`.

6. **Reply with only the path** of your report file.
