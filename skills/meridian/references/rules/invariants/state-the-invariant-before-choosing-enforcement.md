## State the invariant before choosing enforcement

**Law:** State the invariant (a rule the product must always keep true) in words that name no mechanism before you choose how to enforce it or think about concurrency.

**When:** Any change that adds or changes a rule the product must always keep true, before a lock, constraint, queue, or check is chosen for it.

Bad: "Wrap publish in a lock", with no rule stated.
Good: "A form has at most one published version" stated first, then a unique index chosen to keep it true.
