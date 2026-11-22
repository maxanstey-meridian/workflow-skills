## Change the design when it breaks a Law

**Law:** When a spec, plan, or design decision conflicts with a Law, change the design — a decision that breaks a Law is a defect, not a choice.

**When:** Writing or building from a spec or plan, on any stack.

Bad: Building a spec decision "check for a duplicate in code, skip the unique index" as written.
Good: Changing the spec to use the unique index, then building it.
