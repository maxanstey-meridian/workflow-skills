## Recording Invariants

**Default:** a module records the invariants it owns in an `INVARIANTS.md` at the
module root, beside the code a change would break. Colocation is the point: whoever
edits the module meets its rules without needing to know where to look.

An invariant earns an entry only when a capable newcomer could break it with a
reasonable-looking change. A rule already made unrepresentable by a type, or
arbitrated by a database constraint, needs no entry. The constraint already speaks
for itself.

Each entry has a stable ID, unique across the repository and never renumbered once
code or docs cite it (for example `FORM-RULES-001`), and a present-tense title,
as its heading, then its fields:

```markdown
## FORM-RULES-001: A published form never changes
**Rule:** what must hold, in one paragraph.
**Why:** the harm it prevents; the alternative rejected, if one was weighed.
**Accepts:** the known cost of the rule, if any.
**Owner:** `PublishFormUseCase`
**Proof:** `PublishFormTests`
```

- Write the rule as it holds now. When it changes, edit the entry; history lives
  in version control. The file is not a decision log.
- `Accepts` is what stops a later change from "fixing" a deliberate cost. Omit it
  when the rule has none. It holds trade-offs chosen over a working alternative,
  never known defects or unchecked promises: a gap with a doc page is still a
  gap (`coding/root-cause.md`).
- `Owner` names the authoritative boundary from
  `invariants/invariant-enforcement.md`, not every caller on the path.
- Before writing `Owner` or `Proof`, open both and confirm the proof would fail if
  the owner stopped enforcing the rule. A claim the code does not back is worse
  than no entry.
- No status, author, date, or tag fields, and no minimum number of alternatives or
  consequences. A rule is either enforced and proved, or it is not an invariant
  yet.
- A rule that spans modules is recorded by each owner that enforces part of it,
  each entry naming its own boundary and pointing at the others.

A decision with no single owning module, such as deployment topology, contract
generation, or a release policy, does not belong in any `INVARIANTS.md`. If such a
decision keeps being relitigated, record it once in `docs/decisions/` with
Context, Decision, Accepts, and Rejected alternatives.

Plumb checks this: `MER-CP-002`
