## Confirm the proof fails without the owner

**Default:** Before writing `Owner` or `Proof`, open both and confirm the proof would fail if the owner stopped enforcing the rule.

**When:** Writing or changing an entry in a module's `INVARIANTS.md`, whose `Owner` field names the code that enforces the rule and whose `Proof` field names the test that proves it; a claim the code does not back is worse than no entry.

Bad: `Proof: PublishFormTests` named from memory, where the tests never try to edit a published form.
Good: The guard removed locally, the test seen to fail, then the entry written.
