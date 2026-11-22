## Record only rules that are enforced and proved

**Default:** Add an `INVARIANTS.md` entry only when the rule is both enforced and proved; otherwise it is not an invariant yet.

**When:** Deciding whether a rule belongs in `INVARIANTS.md` (each entry requires a real `Owner` and `Proof`).

Bad: Adding an entry for "a published form never changes" with no guard or test.
Good: Writing the guard and test first, then adding the entry.
