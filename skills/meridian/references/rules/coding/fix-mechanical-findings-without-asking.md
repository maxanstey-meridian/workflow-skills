## Fix mechanical findings without asking

**Default:** In a review that also fixes, fix mechanical findings (dead code, stale comments, missing includes, unused variables) without asking, make a design fix from the facts and the agreed rules whatever its size, and ask the user only what those cannot settle, such as removing functionality users have, in one batched question with recommendations.

**When:** A review asked to fix what it finds. In a read-only review, list mechanical findings as mechanical.

Bad: "Should I remove the unused import in `forms.ts`?"
Good: The import removed and listed among the fixes.
