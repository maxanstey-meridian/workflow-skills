## Use FluentResults as the Application result carrier

**Tooling:** Use FluentResults (`Result`, `Result<T>`) to carry a use case's small open set of ordinary failures, and do not write a generic result type per repo.

**When:** .NET Application code (the layer that holds use cases, the code for one operation each). Domain decisions with a closed set of outcomes return their own closed types instead.

Bad: a hand-written `OperationResult<T>` class in `Common/`.
Good: `Result<CreateFormResult>` from FluentResults.
