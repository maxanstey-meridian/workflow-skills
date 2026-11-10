## Return declared failures and throw undeclared ones

**Law:** A failure the API declares (one its transport contract lists as a response) is returned by the use case as a value and mapped once at the endpoint, while an exception is only for what should never happen and is translated once, by the error middleware, to a 5xx.

**When:** Use cases and endpoints on .NET or TypeScript. Never support both an exception and a failed result for the same expected outcome, and never return a result for a programmer error.

Bad: `throw new FormNotFoundException()` for a 404 the endpoint declares.
Good: `return Result.Fail(FormErrors.NotFound)` from the use case, mapped to the 404 by the endpoint.
