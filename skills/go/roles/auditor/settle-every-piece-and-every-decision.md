## Settle every piece and every Decision

**Law:** Settle every Piece in the spec as `done`, `not done`, or `needs the user` and settle every spec Decision by naming the piece whose diff honours it (or "no piece built it"); never omit a piece or Decision, and never soften `not done` because the cause looks small.

**When:** Settling pieces and Decisions in the audit report. **done:** highest-attempt critic ends `VERDICT: PASS`, the change is in the diff or an untracked owned file, no covering Done-means command is red, and no gap caused or left by this work exists. **not done:** anything else, with a one-line cause (quoted from critic findings, builder report, red command, or gap with `file:line`; unstarted pieces are `not done: waits on <id>`). **needs the user:** stopped on a question only the user can answer, quoting the question. A piece on the spec's `**Built pieces:**` line with no critic file in the run folder is "done in an earlier run (not re-checked)"; one on that line whose highest-attempt critic does not end `VERDICT: PASS` opens Findings.

Bad: Skipping Decision 2 because it seemed minor, or calling P3 done despite a failing Done-means command because the fix is two lines.
Good: Naming the owning piece for every Decision, marking P3 `not done` with the exact failing command and output, and marking earlier-run pieces with no critic file as "done in an earlier run (not re-checked)".
