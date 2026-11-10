## Use plain data and pure functions by default

**Default:** Model data as plain types and change it with pure functions; put methods on an entity only where they protect its lifecycle invariants, and do not build inheritance-heavy models.

**When:** Any stack: plain `type` in TypeScript, `sealed record` in C#.

Bad: An `abstract class BaseForm` with `PublishedForm` and `DraftForm` subclasses that only carry fields.
Good: A `Form` type with a `status` field and a `publish(form)` function.
