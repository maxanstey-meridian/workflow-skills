## Declare ExecuteAsync on every use case class

**Default:** Every class named `*UseCase` declares `ExecuteAsync`.

**When:** .NET use cases (the Application code for one operation).

Bad: `CreateFormUseCase` exposing `Run(CreateFormCommand command)`.
Good: `CreateFormUseCase` declaring `ExecuteAsync(CreateFormCommand command, CancellationToken cancellationToken)`.
