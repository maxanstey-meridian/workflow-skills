## State the invariant before choosing enforcement

**Law:** State the invariant in plain words naming no mechanism before choosing enforcement or concurrency controls.

**When:** Adding or changing any product invariant, before picking a lock, constraint, queue, or check.

Bad: "Wrap publish in a lock" with no rule stated.
Good: Stating "a form has at most one published version" first, then choosing a unique index.
