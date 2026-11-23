## Sign 5: Flag duplication (WET)

**Default:** Flag the same query, mapping, DTO shape, helper, constant, rule, or pipeline written twice or more, a UI re-deriving a rule the server decides (a house Law), hand-written TypeScript types or fetch wrappers mirroring server DTOs where a generated client or contract exists, and in Vue a `watch` that copies state into a `ref` where a `computed` would derive it.

**When:** Reviewing repeated logic across files or layers; prove each finding by citing every location and why they would change together (a commit that changed them together is the best evidence). Do not flag coincidental likeness, three similar lines (`coding/extract-a-helper-only-after-the-pattern-repeats.md`), or per-slice code that vertical slices keep local on purpose (`coding/keep-code-local-until-it-is-shared.md`).

Bad: Flagging three similar lines in two unrelated vertical slices, or reporting two files as duplicated without checking whether a change to one requires changing the other.
Good: Flagging a UI `canPublish` check that duplicates `FormLifecycle.cs:42` (a house Law), or two copies of a 30-line query citing the commit that had to update both together.
