## Give every use case a top-level cancellation token

**Default:** Every `ExecuteAsync` takes a `CancellationToken` as its own parameter, not nested in another type.

**When:** .NET use cases (the Application code for one operation).

Bad: `ExecuteAsync(CreateFormCommand command)` with the token inside an options object.
Good: `Task<CreateFormResult> ExecuteAsync(CreateFormCommand command, CancellationToken cancellationToken)`.
