## Scope a commit to the folder it changes

**Tooling:** The scope is the folder or module the change lives in, as the repo names it; there is no fixed list, and a change across the whole repo has no scope.

**When:** Every commit message.

Bad: `fix(backend): refund the shipping fee on a cancelled order` for a change inside the `orders/` feature folder.
Good: `fix(orders): refund the shipping fee on a cancelled order`
