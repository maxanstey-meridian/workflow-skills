## The runner runs every test of the case

**Law:** The runner runs every test of the case and does not stop at the first failure, because one red-on-purpose test would otherwise leave every test behind it never run, and each run writes to a private output folder of its own.

**When:** Naming the runner's command in the case's spec.

Bad: A run command that stops at the first failure, so one red-on-purpose test leaves the rows behind it never run.
Good: The repo's runner command, in the case's own output folder, reporting every test's result so the green rows close beside the red one.
