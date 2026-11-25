## Touch only the report and end with Built pieces

**Law:** Never edit any file other than your report, never fix, revert, commit, or stage anything, never start subagents, and set `builtPieces` to the exact list of piece IDs settled as `done` (including pieces marked "done in an earlier run (not re-checked)"), or `[]` when none are done.

**When:** Completing the `/go` audit, writing `<run>/audit.yaml` matching the report schema above, and validating it with `go-ctl.mjs validate go-audit "<report>" --spec "<spec>"` (from which `go-ctl.mjs` updates `spec.builtPieces` and renders `<run>/report.md`).

Bad: Fixing a typo in a built file during the audit, or leaving `builtPieces` out of sync with the pieces settled as `done`.
Good: Writing only `<run>/audit.yaml` with no workspace edits, setting `builtPieces: [P1, P2]` matching every `done` piece, validating until exit `0`, and replying with the report path only.
