## Use FluentResults as the Application result carrier

**Tooling:** Use FluentResults (`Result`, `Result<T>`) for a use case's small open set of ordinary failures instead of writing a custom generic result type per repo.

**When:** .NET Application code. Domain decisions with a closed set of outcomes still return their own closed types.

Bad: A hand-written `OperationResult<T>` class in `Common/`.
Good: `Result<CreateFormResult>` from FluentResults.
