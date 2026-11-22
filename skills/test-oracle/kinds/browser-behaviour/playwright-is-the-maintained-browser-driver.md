## Playwright is the maintained browser driver

**Law:** Playwright is the maintained browser driver, and the runner's exact command and flags are the repo's: the case's spec and its AGENTS.md name them.

**When:** Choosing the driver, and writing the case's run command.

Bad: A case that drives the browser with its own hand-rolled automation, or invents runner flags the repo's suite never uses.
Good: Playwright specs run by the exact command the repo's AGENTS.md names for its browser suite.
