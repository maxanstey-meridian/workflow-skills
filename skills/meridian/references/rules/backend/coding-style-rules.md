## Coding Style Rules

These are part of the architecture, not just aesthetics.

### General

- data transforms over object hierarchies by default
- explicit orchestration over magic
- readability over abstraction
- top-to-bottom understandable use cases
- minimal dependencies

### .NET

- `sealed` on all concrete types
- records for DTOs, commands, results, value objects
- EF entities may be `sealed class` rather than records
- explicit `IServiceCollection` registration
- no MediatR
- no AutoMapper
- no DI auto-scanning
- use cases named `<UseCaseName>UseCase`
- colocate `Command` and `Result` with the use case — as sibling records (see
  `backend/commands-and-results.md`)

Every class named `*UseCase` declares `ExecuteAsync`, and every `ExecuteAsync`
declaration carries a top-level `CancellationToken` parameter. A token nested in
another generic or options type does not propagate cancellation.

Domain and Application never receive `System.IServiceProvider`.
Composition resolves dependencies; business layers receive explicit constructor
dependencies.

Recommended use case signature:

```csharp
Task<CreateFormResult> ExecuteAsync(CreateFormCommand command, CancellationToken cancellationToken)
```
