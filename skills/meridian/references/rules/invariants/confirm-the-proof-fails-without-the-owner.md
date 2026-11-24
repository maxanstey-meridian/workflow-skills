## Confirm the proof fails without the owner

**Default:** Before listing symbols in `owner` or `proof`, open both and confirm each `proof` check fails if its `owner` boundary stops enforcing the rule.

**When:** Writing or editing an `invariants.yaml` entry (`owner` = bare authoritative enforcing boundary symbols/paths, omitting downstream UI or read-model helpers; `proof` = narrowest failing test or build/analyzer check, never prose and never loosened for unproved rules); an unbacked claim is worse than no entry.

Bad: Listing `PublishFormTests` in `proof` from memory when those tests never try to edit a published form, or listing a UI helper in `owner`.
Good: Removing the guard in `EditFormUseCase` locally, seeing `EditFormTests.EditPublishedFormIsRejected` fail, then listing both bare symbols.
