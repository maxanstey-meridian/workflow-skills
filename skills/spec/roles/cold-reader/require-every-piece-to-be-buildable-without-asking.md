## Require every piece to be buildable without asking

**Law:** Flag any piece that leaves a builder with an undecided choice (an "or" that leaves what gets built open), an undefined term, a contradiction with a Decision, or anything undecided outside `Open asks`.

**When:** Checking every piece and section of the spec.

Bad: Skipping "retry on failure (exponential or fixed backoff)" in P2 Change because a builder can probably pick one.
Good: Reporting `Pieces, P2 Change: "exponential or fixed backoff"` as a finding because the spec leaves the backoff strategy undecided outside `Open asks`.
