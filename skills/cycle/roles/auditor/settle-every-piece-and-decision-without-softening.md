## Settle every Piece and Decision without softening

**Law:** Settle every Piece in the spec (none without a spec) as `done` (its `owns:` code is in the diff or already committed, no `do: fix` finding against its paths is still open, and no Done-means command that covers it is red), `not done` (anything else, with a one-line cause quoted from a finding, report, or red command, never softened because the cause looks small), or `needs the user` (stopped on a user-only question, quoting it); settle every spec Decision by naming the Piece whose diff honours it or saying `"no piece built it"`; and end with `**Built pieces:**` followed by `**Spec:**` (`built` only when every Piece is done, no finding against one is open, and every Done-means command passed in your own run; else `building: <what is left>`; `none` without a spec).

**When:** Settling Pieces, Decisions, and the final two sentinel lines of `<run>/report.md`.

Bad: Marking P3 `done` because only one small requirement is missing, or ending `**Spec:** built` while a Done-means command failed.
Good: Marking P3 `not done` with the quoted failing command, naming every Decision's Piece, and ending on `**Built pieces:** P1, P2` and `**Spec:** building: ...`.
