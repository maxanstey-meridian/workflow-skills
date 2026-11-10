## Give every invariant entry an id and five fields

**Default:** Each entry is a heading with a stable id, unique across the repository and never renumbered once code or docs cite it, and a present-tense title, followed by `Rule`, `Why`, `Accepts`, `Owner`, and `Proof`, with no status, author, date, or tag fields and no minimum number of alternatives or consequences.

**When:** Writing an entry in a module's `INVARIANTS.md`. `Owner` names the authoritative boundary (the place every write must pass), not every caller on the path; `Accepts`, the entry's field for a deliberately chosen cost, is left out when the rule has none.

Bad: `## Publishing rules (draft, owner: Sam, 2026-03)` followed by free prose.
Good: An id and present-tense title, then the five fields:
```markdown
## FORM-RULES-001: A published form never changes
**Rule:** what must hold, in one paragraph.
**Why:** the harm it prevents; the alternative rejected, if one was weighed.
**Accepts:** the known cost of the rule, if any.
**Owner:** `PublishFormUseCase`
**Proof:** `PublishFormTests`
```
