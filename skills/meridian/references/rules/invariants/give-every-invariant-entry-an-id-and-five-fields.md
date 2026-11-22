## Give every invariant entry an id and five fields

**Default:** Each entry has a stable, repo-unique heading id (never renumbered once cited) and present-tense title, followed by `Rule`, `Why`, `Accepts`, `Owner`, and `Proof` — no status, author, date, or tag fields, and no minimum count of alternatives or consequences.

**When:** Writing a module's `INVARIANTS.md`. `Owner` names the authoritative boundary (not every caller); omit `Accepts` when there is no chosen cost.

Bad: `## Publishing rules (draft, owner: Sam, 2026-03)` followed by free prose.
Good:
```markdown
## FORM-RULES-001: A published form never changes
**Rule:** what must hold, in one paragraph.
**Why:** the harm it prevents; the alternative rejected, if one was weighed.
**Accepts:** the known cost of the rule, if any.
**Owner:** `PublishFormUseCase`
**Proof:** `PublishFormTests`
```
