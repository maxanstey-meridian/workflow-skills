## Check that every Proof can fail

**Law:** Flag any piece whose `Proof` does not name a test or check that would go red if its `Change` broke (`tests/write-every-check-so-it-can-fail.md`).

**When:** Checking the `Proof:` line of every piece in the spec.

Bad: Accepting `Proof: "run dotnet build"` for a piece that adds a runtime validation rule.
Good: Reporting that `dotnet build` passes even if the validation rule is removed.
