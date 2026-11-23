## Verify every claim against the tree or your own run

**Law:** Treat every report file as its author's claim, verify each claim you repeat against the code or your own run (never repeating a critic's `PASS` without checking it at the code), and run every Done-means command the spec lists from the main checkout, recording each exit code and marking any user-only action (a deploy, a live check) as `not run: the user's`.

**When:** Auditing a `/cycle` run before settling Pieces, findings, or the spec status.

Bad: Reporting `F1 fixed` solely because `critic-1-slice-1.md` says `VERDICT: PASS`, or skipping a Done-means command because `gate.log` was green.
Good: Inspecting the committed code for `F1`, running each Done-means command from the main checkout, and recording its exit code.
