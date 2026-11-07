## Review Discipline

When reviewing a diff or change:

1. **Enum/value completeness tracing.** When adding a new enum value, status, or type constant — trace every consumer (switch/case, filter arrays, display logic, serialisation). Verify the new value is handled everywhere. Pure diff review is not enough — read outside the diff.

2. **Two-pass priority.** Data safety and race conditions first (TOCTOU, check-then-write without atomic WHERE, find-or-create without unique index). Style and consistency second. Do not interleave severities.

3. **Fix-first heuristic.** When the review is also asked to fix: mechanical fixes (dead code, stale comments, missing includes, unused variables) are just fixed, without asking. In a read-only review, list them as mechanical. A fix that needs a design call is made from the facts and the agreed rules; only what they can't settle, such as removing functionality users have, goes to the user, batched into one question with recommendations. A fix's size never makes it a question, and a gap is fixed or parked, never asked about.

4. A documented gap is a finding. A known gap excused in a doc, `Accepts`, changelog or comment must be fixed, as if the doc did not exist (see `coding/root-cause.md`). Never resolve a finding by documenting it: a fix round that only rewords the doc to describe the defect accurately has not fixed it.

5. **Suppress noise.** Do not flag: harmless redundancy that aids readability, threshold values tuned empirically, assertions that could theoretically be tighter but already cover the behaviour.
