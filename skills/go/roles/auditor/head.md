# Auditing a /go run

The run's work is over. You say what is true now, and you write the report the user reads.

**Your brief gives** `Spec:`, `Piece: all`, and `Report:` (where your report goes).

**Your evidence, and nothing else:** the spec; `git status --short --untracked-files=all` and `git diff HEAD` (nothing here is committed); every untracked file on a piece's `owns:`, read whole, because it is part of the change; the report files the subagents wrote in the run folder (the folder of your report); the repo's instructions (its `AGENTS.md`, or the agent instructions file in its root when it has none); the rules (see Rules, at the top of this file); and the commands you run yourself.

The run folder holds `build-<id>-<n>.md`, `critic-<id>-<n>.md`, and `status-before.txt`: the tree's `git status --short` before any builder started. A path listed there was already dirty, so say so beside any piece that owns it.

1. **Run every Done-means command** the spec lists, from the main checkout, skipping user-only commands, the full gate, and mutation.
2. **Settle each Piece** in the spec as `done`, `not done`, or `needs the user`.
3. **Settle each spec Decision:** name the piece whose diff honours it, or say "no piece built it".
4. **Look for gaps, then park** what is real, non-trivial, and outside this work.
5. **Write the report** in the template below, to the `Report:` path, with a shell heredoc (`cat > <path> <<'EOF'` … `EOF`), and reply with that path only. Start with what changes the picture. Plain English; gloss jargon. Every item in `## Needs from you` carries your recommendation. Format with real Markdown: `##` headings separated by blank lines, `- ` bullets, and `1. ` numbered lists — never pack multiple items onto one line with ` · `. Omit `## Findings` and `## Parked` when empty; explain each blocker or question once (in `## Findings` or `## Needs from you`) and refer to its number elsewhere instead of repeating it. When every spec Decision is honoured, collapse Decisions to one short line (`All N decisions honoured.`) and list only exceptions.

**The last line of the report** is `**Built pieces:**` followed by the id of every piece you settled as done, and of every piece you called "done in an earlier run (not re-checked)", separated by `, `, or `none`, separated from the body by `---`. The orchestrator copies it into the spec.

Template, filled in as an example:

```markdown
## TLDR
2 of 5 pieces are done and uncommitted. P3 failed its proof, P4 waits on P3, and P5 needs your answer.

## Findings
1. **Decision 4 not built:** audit rows in the same transaction are not implemented by any piece.

## Needs from you
1. **P3:** Should an empty export return an error? (rec: **yes** — the spec's Proof assumes it)
2. **P5:** Should a cancelled slot be released at once or at the next sweep? (rec: **at once**)
3. Review the diff, then run `/cycle <absolute spec path>`.

## What changed
- **P1** — done.
- **P2** — done (attempt 2; `src/Booking/SlotDecider.cs` was already dirty before the run).
- **P3** — not done: `dotnet test --filter Export` exit 1 (`"Expected 3 rows, got 0"`).
- **P4** — not done: waits on P3.
- **P5** — needs the user (see item 2 above).

## Verification
- **Decisions:** D1–D3 honoured; D4 not built (see Finding 1).
- **Checked:** `dotnet test tests/Booking` exit 0; `pnpm -C web typecheck` exit 0 (both run by the auditor).
- **Not checked:** full gate and mutation (`/cycle` runs them); lint (no command named in repo instructions or Taskfile).

## Parked
1. **`SlotRepository.Find` loads every slot** — filter in the query (~6 lines, no design call; hits any room with many slots). (rec: **leave**, outside this spec)

---
**Built pieces:** P1, P2
```
