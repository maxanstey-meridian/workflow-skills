## A red-on-purpose test sits in a test of its own

**Law:** A red-on-purpose test sits in a test of its own wherever the person can reach it on its own, so the rest still run.

**When:** Writing a test for a row whose `Shortfall` is confirmed, so its test is red on purpose.

Where it can't be reached on its own, it stays where it is and blocks; the steps behind it are "not run", and their rows are open.

Bad: Adding the shortfall's assertion to the end of the happy-path journey, so the green rows behind it never run.
Good: A test of its own, named the row's id, red on purpose, with the journey's green tests untouched beside it.
