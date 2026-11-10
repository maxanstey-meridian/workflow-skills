## Use a durable queue only to assign serial ownership

**Default:** Use an established durable queue only when the invariant crosses the process boundary and the domain can give one partition or consumer serial ownership of the work.

**When:** Backend code considering a queue or durable messaging. A queue changes who owns the work and how it is processed; it is not a stronger form of database concurrency control.

Bad: A queue put in front of "update stock" to avoid a lost update.
Good: A conditional `UPDATE ... WHERE quantity >= @n`.
