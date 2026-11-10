## Record only invariants a newcomer could break

**Default:** Give an invariant an entry only when a capable newcomer could break it with a reasonable-looking change; a rule a type makes unrepresentable, or a database constraint arbitrates, needs none.

**When:** Deciding what goes in a module's `INVARIANTS.md`.

Bad: An entry "an email is unique" when a unique index already enforces it.
Good: No entry for the unique email, and an entry for "a published form never changes", which only a use case guards.
