## Commands and Results

Command and Result records are **siblings of the use case in the same file**,
never nested inside the use case class. (Older code may nest them as
`CreateFormUseCase.Command`; un-nest when you touch it.)

```csharp
public sealed record CreateFormCommand(string Name);
public sealed record CreateFormResult(Guid Id);

public sealed class CreateFormUseCase { /* ... */ }
```

Sibling records keep call sites readable (`CreateFormCommand`, not
`CreateFormUseCase.Command`) and keep the use case class purely behavioral.
