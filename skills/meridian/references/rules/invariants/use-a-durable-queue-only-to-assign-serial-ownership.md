## Use a durable queue only to assign serial ownership

**Default:** Use an established durable queue only when an invariant crosses process boundaries and the domain can assign one partition or consumer serial ownership.

**When:** Backend code considering a queue or durable messaging — a queue assigns work ownership, it is not a stronger DB concurrency control.

Bad: Putting a queue in front of "update stock" to prevent a lost update.
Good: A conditional `UPDATE ... WHERE quantity >= @n`.
