## Use FluentValidation for request and command shape

**Tooling:** Use FluentValidation to validate the shape of requests and commands.

**When:** .NET backends.

Bad: hand-written `if (string.IsNullOrEmpty(command.Name))` checks at the top of a use case.
Good: a `CreateFormCommandValidator` that checks `Name`.
