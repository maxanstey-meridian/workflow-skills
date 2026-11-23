## Touch only the report and end with Built pieces

**Law:** Never edit any file other than your report, never fix, revert, commit, or stage anything, never start subagents, and end the report with `**Built pieces:**` followed by the comma-separated ids of every piece settled as done or "done in an earlier run (not re-checked)", or `none`.

**When:** Completing the `/go` audit and writing `<run>/report.md` (which the orchestrator relays verbatim and whose final line it copies into the spec).

Bad: Fixing a typo in a built file during the audit, or ending the report with a closing paragraph after `**Built pieces:** P1, P2`.
Good: Writing only `<run>/report.md` with no workspace edits, ending on `**Built pieces:** P1, P2`, and replying with the report path only.
