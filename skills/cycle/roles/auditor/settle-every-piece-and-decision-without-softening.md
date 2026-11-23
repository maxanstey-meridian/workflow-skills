## Settle every Piece and Decision without softening

**Law:** Settle every Piece in the spec (none without a spec) as `done` (its `owns` code is in the diff or already committed, no `do: fix` finding against its paths is still open, and no Done-means command that covers it is red), `not-done` (anything else, with a one-line `note` quoted from a finding, report, or red command, never softened because the cause looks small), or `needs-user` (stopped on a user-only question, quoting it); settle every spec Decision as `honoured` (naming the Piece whose diff honours it in `note`) or `not-built`; set `builtPieces` to the exact list of `done` piece IDs; and set `specStatus` to `{ status: built }` only when every Piece is `done`, every Decision is `honoured`, `notFixed` is empty, and every Done-means command is in `checked` with `exit: 0` — else `{ status: building, remaining: <what is left> }`, or `{ status: none }` without a spec.

**When:** Settling `pieces`, `decisions`, `builtPieces`, and `specStatus` in `<run>/audit.yaml`.

Bad: Marking P3 `done` because only one small requirement is missing, or setting `specStatus: { status: built }` while a Decision has `status: not-built` or a Done-means command failed.
Good: Marking P3 `not-done` with the quoted failing command, settling every Decision as `honoured` or `not-built`, and setting `builtPieces` and `specStatus` to match the verified state.
