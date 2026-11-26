# Auditing a /cycle run

The run's work is over. You say what is true now, and you write the YAML audit report that `cycle-ctl.mjs` renders to `<run>/report.md` for the user. The orchestrator is not a source: you take nothing from it but the lines of your brief.

**Your brief gives** `Spec:` (the absolute path of `spec-<name>.yaml`, or `none`), `Files:` (the run folder, written `<run>` below), `Mode: none`, `Findings: none`, and `Report:` (`<run>/audit.yaml`). `<skill>` is the folder above the `references/` folder this file lives in.

**Your evidence, and nothing else:** the spec YAML, when `Spec:` is not `none`; `git status --short` and `git diff`; every file in the run folder; the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the rules (see Rules, at the top of this file); and the commands you run yourself.

In the run folder, `base.txt` holds the commit before the cycle, so the cycle's commits are `git log $(cat <run>/base.txt)..HEAD` and its whole change is `git diff $(cat <run>/base.txt)..HEAD`. `scope.txt` lists what the cycle covered, `left-out.txt` what it left alone, `all.txt` the initial uncommitted list, `review-*.yaml` the reviewers' findings, `fix-*.yaml` and `critic-*.yaml` the fixers' and critics' reports, and `gate.log` the gate.

1. **Run every Done-means command** the spec lists, from the main checkout, and record each with its exit code in `checked` (or `notChecked` if user-only).
2. **Settle each Piece** (`done`, `not-done`, or `needs-user`) and **each spec Decision** (`honoured` or `not-built`).
3. **Settle every `do: fix` finding** in every `review-*.yaml` report against its last critic report and the code (placing each into `fixed`, `notAHarm`, or `notFixed`), and copy every `status: justified` entry from doctrine review reports (`review-<r>-(backend|frontend)-<n>.yaml`) into `justifiedMachinery`.
4. **Audit commits, `left-out.txt`, `gate.log`, and mutation** (once, if configured).
5. **Write strict YAML matching the schema below** to `Report:` (`<run>/audit.yaml`) with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`). Each entry in `needsFromYou` takes one of two shapes:
   - **Structured decision item** (for any item asking the user to decide, including `ask` and `NEEDS_CALL` findings): `item`, `whatItIs`, and `options` (at least two entries, each with a unique `label`, a concrete `summary`, and `recommended: true` on the single recommended option). Inline any cited ruling or code fact in `whatItIs` so the user can decide without opening external files, and state concretely in each option's `summary` what the product or suite will or won't do.
   - **Simple action item** (for single-action items such as running `/cycle` or release actions): `item`, `rec`, and optional `detail`.
   Set `builtPieces` to the exact list of piece IDs with `status: done`. Set `specStatus` to:
   - `{ status: built }` only when every Piece is `done`, every Decision is `honoured`, `notFixed` is empty, and every Done-means command is in `checked` with `exit: 0`;
   - `{ status: building, remaining: <what is left> }` otherwise when `Spec:` is not `none`;
   - `{ status: none }` when `Spec:` is `none` (with `pieces: []`, `decisions: []`, `builtPieces: []`).

Report schema:

<!-- schema: CycleAuditReportSchema -->

An example of a saved `audit.yaml` file:

```yaml
tldr: The cycle committed the work in 2 commits and fixed 1 of 3 review findings. The gate is green, piece P3 is still not built, and 1 design call awaits you.
findings:
  - title: P3 was never built
    detail: "`dotnet test --filter Export` exits 1 and no commit in the cycle touches `ExportService`."
needsFromYou:
  - item: "Booking read and export projections (`F3`)"
    whatItIs: "`BookingProjection.cs:17` (`NEEDS_CALL`) duplicates ~30 lines of mapping between the read model and CSV export projections."
    options:
      - label: A
        summary: Keep the two projections separate so read-model changes cannot alter exported CSV columns.
        recommended: true
      - label: B
        summary: Merge both into one shared mapper, removing ~30 lines of duplication while coupling both shapes.
  - item: "Untracked file from another session (`api/Scratch.cs`)"
    whatItIs: "`api/Scratch.cs` appeared in the working tree during the run and is not included in any commit."
    options:
      - label: A
        summary: Leave `api/Scratch.cs` untouched for the other session to own and commit.
        recommended: true
      - label: B
        summary: Review and fold `api/Scratch.cs` into this branch in a follow-up step.
  - item: Release actions are yours to ask for.
    rec: decide when ready
pieces:
  - id: P1
    status: done
  - id: P2
    status: done
  - id: P3
    status: not-done
    note: "`dotnet test --filter Export` exits 1 (see Finding 1)."
decisions:
  - id: D1
    status: honoured
    note: Built in P1.
  - id: D2
    status: honoured
    note: Built in P2.
checked:
  - cmd: dotnet test --filter ReleaseStale
    exit: 0
    pieces:
      - P1
      - P2
  - cmd: dotnet test --filter Export
    exit: 1
    pieces:
      - P3
notChecked:
  - check: api/src/Shared/Clock.cs
    reason: No review report names it.
  - check: lint
    reason: No command named in repo instructions or Taskfile.
parked:
  - item: "`SlotRepository.Find` loads every slot"
    detail: Filter in the query (~6 lines, no design call; hits any room with many slots).
    rec: leave
    why: Older than this work.
builtPieces:
  - P1
  - P2
commits:
  - sha: 4f1c2ab
    subject: "feat(bookings): release stale bookings by UTC"
    bullets: []
  - sha: 9be03d1
    subject: "fix(bookings): take the cutoff from IClock"
    bullets:
      - Read `IClock.UtcNow` instead of `DateTime.UtcNow`, with a non-UTC test (`ReleaseStaleBookings.cs:28`).
      - Await the save before closing the dialog (`bookings.vue:94`).
fixed:
  - findingId: F1
    report: review-1-slice-2.yaml
    summary: Read `IClock.UtcNow` instead of `DateTime.Now`, verified by non-UTC test.
notAHarm:
  - findingId: F4
    report: review-1-frontend-1.yaml
    reason: Verified at `bookings.vue:118-124`; save is already awaited.
notFixed:
  - findingId: F3
    report: review-1-slice-2.yaml
    reason: "`NEEDS_CALL` — awaiting decision on keeping two projections or merging."
justifiedMachinery:
  - report: review-1-backend-1.yaml
    file: api/src/Bookings/BinaryFrameCodec.cs
    symbol: BinaryFrameCodec
    candidatesChecked:
      - System.Text.Json (10.x)
      - MessagePack-CSharp (3.x)
    constraint: Hardware gateway emits a fixed 12-byte custom framing header neither serializer supports.
gate: green
mutation: 1 survivor on a changed line — `ReleaseStaleBookings.cs:44` (`<` to `<=`).
specStatus:
  status: building
  remaining: P3's Proof still fails (`dotnet test --filter Export` exit 1).
```

6. **Validate your report** before replying (omit `--spec "<spec>"` when `Spec:` is `none`):

```sh
node <skill>/scripts/cycle-ctl.mjs validate cycle-audit "<report>" --spec "<spec>" --run "<run>"
```

Fix any YAML, schema, finding-accounting, or spec-completeness error until the command exits `0`, then reply with only the report path.
