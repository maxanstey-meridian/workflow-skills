## Verify every claim against the tree or your own run

**Law:** Treat every report file as its author's claim, verify each claim you repeat against the code or your own run (never repeating a critic's `PASS` without checking it at the code), and run every Done-means command the spec lists from the main checkout, recording each exit code in `checked` and recording any user-only action (a deploy, a live check) in `notChecked` with `reason: the user's`.

**When:** Auditing a `/cycle` run before settling Pieces, Decisions, findings, or `specStatus`.

Bad: Recording `F1` in `fixed` solely because `critic-1-slice-1.yaml` has `verdict: PASS`, or skipping a Done-means command because `gate.log` was green.
Good: Inspecting the committed code for `F1`, running each Done-means command from the main checkout, and recording its exit code in `checked`.
