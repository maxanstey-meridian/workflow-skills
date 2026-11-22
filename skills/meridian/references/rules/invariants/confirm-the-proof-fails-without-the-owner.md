## Confirm the proof fails without the owner

**Default:** Before writing `Owner` or `Proof`, open both and confirm the proof fails if the owner stops enforcing the rule.

**When:** Writing or editing an `INVARIANTS.md` entry (`Owner` = enforcing code, `Proof` = proving test); an unbacked claim is worse than no entry.

Bad: Writing `Proof: PublishFormTests` from memory when those tests never try to edit a published form.
Good: Removing the guard locally, seeing the test fail, then writing the entry.
