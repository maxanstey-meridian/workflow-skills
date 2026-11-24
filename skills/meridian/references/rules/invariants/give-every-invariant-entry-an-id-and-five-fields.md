## Give every invariant entry an id and five fields

**Default:** Each `invariants.yaml` file holds a top-level `invariants` sequence with no file-level intro prose and no unknown keys, where every entry has required `id` (`[A-Z]+(?:-[A-Z]+)*-\d{3}`, repo-unique and never renumbered once cited), present-tense `title`, `rule`, `why`, and non-empty bare symbol/path lists `owner` and `proof`, plus optional `accepts` and `related`.

**When:** Writing a module's `invariants.yaml`. No status, author, date, or tag fields, and no prose mixed into `owner` or `proof`; omit `accepts` when there is no deliberate trade-off and omit `related` when no cross-module rule IDs apply.

Bad: Top-level intro prose, `status: draft`, or `owner: "PublishFormUseCase checks status before saving"`.
Good:
```yaml
invariants:
  - id: FORM-RULES-001
    title: A published form never changes
    rule: Once a form is published, its fields and settings cannot be edited.
    why: Submissions reference the published structure; editing in place would corrupt historical answers.
    accepts: Authors must create a new draft version to change a published form.
    owner:
      - PublishFormUseCase
      - EditFormUseCase
    proof:
      - EditFormTests.EditPublishedFormIsRejected
    related:
      - SUB-001
```
