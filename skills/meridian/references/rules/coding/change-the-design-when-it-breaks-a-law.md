## Change the design when it breaks a Law

**Law:** When a spec, plan, or design decision conflicts with a Law (a rule whose violation is a bug), change the design; a decision that breaks a Law is a defect, not a choice.

**When:** Writing or building from a spec or plan, on any stack.

Bad: A spec decision "check for a duplicate in code, skip the unique index" built as written.
Good: The spec changed to use the unique index, then built.
