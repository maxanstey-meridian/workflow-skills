## Fix a gap, never document it

**Law:** Fix a gap when this work caused it, promised it, or the fix is trivial, and report any other gap as new work; never ask whether to fix it, and never record it in a decision record, invariants `Accepts`, changelog "known issue", README caveat, or code comment instead.

**When:** Meeting any fixable wrong, unenforced, or unchecked thing: an unverified promise, an unguarded entry point, a false positive, or a rule holding only because no caller does X today. The test: would we welcome a change removing it at no other cost? If yes, it is a gap.

Bad: An endpoint outside the tenant guard, "fixed" by a README line "admin routes are not tenant-scoped".
Good: The tenant guard applied to the endpoint.
