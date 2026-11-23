## Settle every piece and every Decision

**Law:** Settle every Piece in `spec.pieces` as `done`, `not-done`, or `needs-user` and settle every spec Decision in `spec.decisions` as `honoured` (naming the piece whose diff honours it in `note`) or `not-built`; never omit a piece or Decision, and never soften `not-done` because the cause looks small.

**When:** Settling pieces and Decisions in `audit.yaml`. **done:** highest-attempt critic has `verdict: PASS`, the change is in the diff or an untracked owned file, no covering Done-means command is red, and no gap caused or left by this work exists. **not-done:** anything else, with a one-line `note` (quoted from critic findings, builder report, red command, or gap with `file:line`; unstarted pieces are `waits on <id>`). **needs-user:** stopped on a question only the user can answer, quoting the question. A piece in `spec.builtPieces` with no critic file in the run folder is `status: done` with `note: done in an earlier run (not re-checked)`; one in `spec.builtPieces` whose highest-attempt critic does not have `verdict: PASS` adds a `findings` entry.

Bad: Skipping Decision D2 because it seemed minor, or calling P3 `done` despite a failing Done-means command because the fix is two lines.
Good: Settling every Decision with its owning piece, marking P3 `not-done` with the exact failing command and output, and marking earlier-run pieces with no critic file as `status: done` with `note: done in an earlier run (not re-checked)`.
