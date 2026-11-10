## Treat an expected constraint conflict as an outcome

**Default:** A constraint conflict the design expects is returned as an outcome, not left to surface as an infrastructure failure.

**When:** Adapters (the implementations of ports against a database or client) that write under a constraint, on .NET or TypeScript.

Bad: A unique-index violation that reaches the client as a 500.
Good: The adapter catching that violation and returning "name already taken".
