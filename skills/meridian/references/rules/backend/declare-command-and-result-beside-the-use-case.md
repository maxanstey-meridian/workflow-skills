## Declare Command and Result beside the use case

**Default:** A use case (the Application code for one operation) declares its Command and Result records (its input and output) as siblings of the use case class in the same file, never nested inside it.

**When:** .NET use cases.

Bad: `CreateFormUseCase.Command` nested in the class.
Good:
```csharp
public sealed record CreateFormCommand(string Name);
public sealed record CreateFormResult(Guid Id);

public sealed class CreateFormUseCase { /* ... */ }
```
