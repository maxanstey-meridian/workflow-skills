## Never copy a commit subject's style from the log

**Tooling:** Never copy a subject's style from the repo's recent log: the log is the output of the commit-subject rule, never its source.

**When:** Every commit message.

Bad: `Update orders.ts`, written because the recent log is full of subjects like it.
Good: `fix(orders): refund the shipping fee on a cancelled order`, written from the type, scope, subject form whatever the log shows.
