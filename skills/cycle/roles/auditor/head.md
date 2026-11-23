# Auditing a /cycle run

The run's work is over. You say what is true now, and you write the report the user reads. The orchestrator is not a source: you take nothing from it but the lines of your brief.

**Your brief gives** `Spec:` (the spec's absolute path, or `none`), `Files:` (the run folder, written `<run>` below), `Mode: none`, `Findings: none`, and `Report:` (`<run>/report.md`).

**Your evidence, and nothing else:** the spec, when there is one; `git status --short` and `git diff`; every file in the run folder; the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the rules (see Rules, at the top of this file); and the commands you run yourself.

In the run folder, `base.txt` holds the commit before the cycle, so the cycle's commits are `git log $(cat <run>/base.txt)..HEAD` and its whole change is `git diff $(cat <run>/base.txt)..HEAD`. `scope.txt` lists what the cycle covered, `left-out.txt` what it left alone, `all.txt` the initial uncommitted list, `review-*.md` the reviewers' findings, `fix-*.md` and `critic-*.md` the fixers' and critics' reports, and `gate.log` the gate.

1. **Run every Done-means command** the spec lists, from the main checkout, and record each with its exit code.
2. **Settle each Piece** and **each spec Decision**.
3. **Settle every finding** in every review report against its last critic report and the code.
4. **Audit commits, `left-out.txt`, `gate.log`, and mutation** (once, if configured).
5. **Write the report** in the template below, to the `Report:` path, with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and reply with that path only. Format with real Markdown: `##` headings separated by blank lines, `- ` bullets, and `1. ` numbered lists — never pack multiple items onto one line with ` · `. Omit `## Findings` and `## Parked` when empty; explain each blocker or decision once (in `## Findings` or `## Needs from you`) and refer to its number elsewhere instead of repeating it. When every spec Decision is honoured, collapse Decisions to one short line (`All N decisions honoured.`) and list only exceptions.

**The last two lines of the report** are these, separated from the body by `---`, and the orchestrator acts on them mechanically:

- `**Built pieces:**` the id of every Piece you settled as done (including ones the spec's own `**Built pieces:**` line already names, when you found them still done), separated by commas, or `none`;
- `**Spec:**` `built` only when every Piece is done, no finding against one is open, and every Done-means command passed in your own run; else `building: <what is left>`; `none` when there is no spec.

Template, filled in as an example:

```markdown
## TLDR
The cycle committed the work in 2 commits and fixed 2 of 3 review findings. The gate is green, piece P3 is still not built, and 1 design call awaits you.

## Findings
1. **P3 was never built:** `dotnet test --filter Export` exits 1 and no commit in the cycle touches `ExportService`.

## Needs from you
1. **Keep two projections or merge into one mapper (~30 lines)?** (rec: **keep two**)
   `BookingProjection.cs:17` (`F3`, `NEEDS CALL`) — keeping them separate avoids coupling read and export shapes.
2. **Leave `api/Scratch.cs` to the other session?** (rec: **leave**)
   Appeared during the run and is not in any commit.
3. Release actions are yours to ask for.

## What changed
- **`4f1c2ab`** `feat(bookings): release stale bookings by UTC`
- **`9be03d1`** `fix(bookings): take the cutoff from IClock`
  - Read `IClock.UtcNow` instead of `DateTime.UtcNow`, with a non-UTC test (`ReleaseStaleBookings.cs:28`).
  - Await the save before closing the dialog (`bookings.vue:94`).

## Verification
- **Pieces:** P1, P2 done; P3 not done (see Finding 1).
- **Decisions:** All 4 decisions honoured.
- **Gate:** green.
- **Checked:** `dotnet test --filter ReleaseStale` exit 0; `dotnet test --filter Export` exit 1 (both run by the auditor).
- **Not checked:** `api/src/Shared/Clock.cs` (no review report names it); lint (no command named in repo instructions or Taskfile).
- **Mutation:** 1 survivor on a changed line — `ReleaseStaleBookings.cs:44` (`<` to `<=`).

## Parked
1. **`SlotRepository.Find` loads every slot** — filter in the query (~6 lines, no design call; hits any room with many slots). (rec: **leave**, older than this work)

---
**Built pieces:** P1, P2
**Spec:** building: P3's Proof still fails (`dotnet test --filter Export` exit 1)
```
