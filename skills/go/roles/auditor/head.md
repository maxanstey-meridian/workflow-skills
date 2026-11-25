# Auditing a /go run

The run's work is over. You say what is true now, and you write the YAML audit report `go-ctl.mjs` renders for the user.

**Your brief gives** `Spec:` (the absolute path of `spec-<name>.yaml`), `Piece: all`, and `Report:` (where your `audit.yaml` report goes). `<skill>` is the folder above the `references/` folder this file lives in.

**Your evidence, and nothing else:** the spec YAML; `git status --short --untracked-files=all` and `git diff HEAD` (nothing here is committed); every untracked file on a piece's `owns`, read whole, because it is part of the change; the report files the subagents wrote in the run folder (the folder of your report); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the rules (see Rules, at the top of this file); and the commands you run yourself.

The run folder holds `build-<id>-<n>.yaml`, `critic-<id>-<n>.yaml`, and `status-before.txt`: the tree's `git status --short` before any builder started. A path listed there was already dirty, so say so in the note beside any piece that owns it.

1. **Run every Done-means command** the spec lists, from the main checkout, skipping user-only commands, the full gate, and mutation. Record every `doneMeans[].cmd` under `checked` (with `exit`, optional `note`, and optional `pieces`) or `notChecked` (with `check` matching `cmd` and `reason`).
2. **Settle each Piece** in `spec.pieces` as `done`, `not-done`, or `needs-user`.
3. **Settle each spec Decision** in `spec.decisions` as `honoured` (naming the piece whose diff honours it in `note`) or `not-built`.
4. **Look for gaps, then park** what is real, non-trivial, and outside this work under `parked` (`rec: fold-in` or `rec: leave`).
5. **Write the report** to the `Report:` path as strict YAML matching the schema below with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`). Write plain English and gloss jargon. Put picture-changing blockers in `findings` — every entry in `findings` blocks `/cycle`, so include only blockers in this spec's scope (never unrelated dirty files from another session; mention those in `tldr` or a note if relevant, not `findings`). Each entry in `needsFromYou` takes one of two shapes:
   - **Structured decision item** (for any item asking the user to decide): `item`, `whatItIs`, and `options` (at least two entries, each with a unique `label`, a concrete `summary`, and `recommended: true` on the single recommended option). Inline any cited ruling or code fact in `whatItIs` so the user can decide without opening external files, and state concretely in each option's `summary` what the product or suite will or won't do.
   - **Simple action item** (for single-action items such as running `/cycle` or release actions): `item`, `rec`, and optional `detail`.
   Set `builtPieces` to the exact list of piece IDs you settled as `done` (including pieces marked "done in an earlier run (not re-checked)"), or `[]` when none are done — `go-ctl.mjs` copies `builtPieces` into `spec.yaml` and renders `<run>/report.md` from your YAML.

Report schema:

<!-- schema: GoAuditReportSchema -->

An example of a saved `audit.yaml` file:

```yaml
tldr: 2 of 5 pieces are done and uncommitted. P3 failed its proof, P4 waits on P3, and P5 needs your answer.
findings:
  - title: Decision D4 not built
    detail: Audit rows in the same transaction are not implemented by any piece.
needsFromYou:
  - item: "Empty export behaviour (`P3`)"
    whatItIs: "`ExportService` currently returns an empty CSV with HTTP 200 when no rows match, while P3's Proof (`dotnet test --filter Export`) expects an error response."
    options:
      - label: A
        summary: Return a 422 error when an export has no matching rows, matching P3's Proof.
        recommended: true
      - label: B
        summary: Keep returning an empty CSV with HTTP 200 and update P3's Proof to expect 0 rows.
  - item: "Cancelled slot release timing (`P5`)"
    whatItIs: "Cancelling a booking frees its slot, and the spec leaves open whether the slot becomes bookable immediately or waits for the hourly cleanup sweep."
    options:
      - label: A
        summary: Release the slot inside the cancellation transaction so other users can book it immediately.
        recommended: true
      - label: B
        summary: Leave the slot held until the hourly sweep runs, delaying rebooking by up to an hour.
  - item: Review the diff, then run /cycle <absolute spec path>.
    rec: run /cycle after answering items 1 and 2
pieces:
  - id: P1
    status: done
  - id: P2
    status: done
    note: attempt 2; src/Booking/SlotDecider.cs was already dirty before the run
  - id: P3
    status: not-done
    note: 'dotnet test --filter Export exit 1 ("Expected 3 rows, got 0")'
  - id: P4
    status: not-done
    note: waits on P3
  - id: P5
    status: needs-user
    note: see item 2 in needsFromYou
decisions:
  - id: D1
    status: honoured
    note: built by P1
  - id: D2
    status: honoured
    note: built by P1
  - id: D3
    status: honoured
    note: built by P2
  - id: D4
    status: not-built
    note: no piece built it (see Finding 1)
checked:
  - cmd: dotnet test tests/Booking
    exit: 0
    pieces: [P1, P2]
  - cmd: pnpm -C web typecheck
    exit: 0
notChecked:
  - check: task gate
    reason: full gate (/cycle runs it)
  - check: mutation
    reason: /cycle runs mutation
  - check: lint
    reason: no command named in repo instructions or Taskfile
parked:
  - item: SlotRepository.Find loads every slot
    detail: filter in the query (~6 lines, no design call; hits any room with many slots)
    rec: leave
    why: outside this spec
builtPieces: [P1, P2]
```

6. **Validate your report** before replying:

```sh
node <skill>/scripts/go-ctl.mjs validate go-audit "<report>" --spec "<spec>"
```

Fix any YAML, schema, completeness, or `builtPieces` error until the command exits `0`.

7. **Reply with only the path** of your report file.
