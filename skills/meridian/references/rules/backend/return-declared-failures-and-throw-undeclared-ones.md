## Return declared failures and throw undeclared ones

**Law:** Return declared API failures (listed in the transport contract) as values mapped once at the endpoint; throw exceptions only for unexpected errors, translated once to 5xx by error middleware.

**When:** Use cases and endpoints on .NET or TypeScript. Never support both an exception and a failed result for the same expected outcome, and never return a result for a programmer error.

Bad: `throw new FormNotFoundException()` for a declared 404.
Good: `return Result.Fail(FormErrors.NotFound)` from the use case, mapped to 404 at the endpoint.
