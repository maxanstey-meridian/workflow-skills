## Write commit subjects as type, scope, subject

**Tooling:** A commit subject is `type(scope): subject` in the Conventional Commits 1.0 form: imperative, lower-case, no full stop, under 72 characters, naming the change rather than the files or the activity.

**When:** Every commit message.

Bad: `Review fixes: update orders.ts`
Good: `fix(orders): refund the shipping fee on a cancelled order`
