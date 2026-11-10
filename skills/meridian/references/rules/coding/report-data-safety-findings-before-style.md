## Report data safety findings before style

**Default:** Review data safety and races first (a check before a write with no atomic condition in the write, find-or-create with no unique index), then style and consistency, and do not mix the two in the findings.

**When:** Reviewing a diff on any stack.

Bad: A review that lists a naming nit first and the find-or-create race fourth.
Good: The race first under its own heading, the nit after.
