## Record only rules that are enforced and proved

**Default:** Give a rule an entry only when it is both enforced and proved; a rule that is not is not an invariant yet and gets no entry.

**When:** Deciding whether a rule belongs in a module's `INVARIANTS.md`, whose entries each name an `Owner` (the code that enforces the rule) and a `Proof` (the test that proves it).

Bad: An entry for "a published form never changes" when no code guards it and no test covers it.
Good: The guard and its test written first, then the entry.
