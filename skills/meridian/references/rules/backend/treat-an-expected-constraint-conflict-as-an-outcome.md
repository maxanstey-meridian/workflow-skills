## Treat an expected constraint conflict as an outcome

**Default:** Catch expected constraint conflicts and return them as domain/application outcomes rather than letting them surface as infrastructure errors.

**When:** Adapters writing under a DB or client constraint on .NET or TypeScript.

Bad: Letting a unique-index violation reach the client as a 500.
Good: Catching the violation in the adapter and returning "name already taken".
