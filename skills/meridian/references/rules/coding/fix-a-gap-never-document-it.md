## Fix a gap, never document it

**Law:** Fix a gap when this work caused it, promised it, or the fix is trivial, and report any other gap as new work; never ask the user whether to fix it, and never record it as a decision record, an accepted cost in the module's invariants file, a changelog "known issue", a README caveat, or a code comment instead.

**When:** Any work that meets a gap, meaning something wrong, unenforced, or unchecked that could be fixed: a promise nothing verifies, an entry point outside a guard, a false positive, or a rule that holds only because no caller does X today. The test: would we welcome a change that removed it at no other cost? If yes, it is a gap.

Bad: An endpoint outside the tenant guard, "fixed" by a README line "admin routes are not tenant-scoped".
Good: The tenant guard applied to the endpoint.
