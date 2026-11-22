## Declare Command and Result beside the use case

**Default:** Declare a use case's Command and Result records as sibling top-level types in the same file, never nested inside the use case class.

**When:** .NET use cases.

Bad: `CreateFormUseCase.Command` nested in the class.
Good:
```csharp
public sealed record CreateFormCommand(string Name);
public sealed record CreateFormResult(Guid Id);

public sealed class CreateFormUseCase { /* ... */ }
```
