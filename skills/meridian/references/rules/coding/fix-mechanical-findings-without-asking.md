## Fix mechanical findings without asking

**Default:** In a fix-enabled review, fix mechanical findings (dead code, stale comments, missing includes, unused variables) without asking, make design fixes settled by facts and rules regardless of size, and ask the user only what those cannot settle (e.g., removing user-facing features) in one batched question with recommendations.

**When:** A review asked to fix findings. In a read-only review, label mechanical findings as mechanical.

Bad: "Should I remove the unused import in `forms.ts`?"
Good: Removing the import and listing it among the fixes.
