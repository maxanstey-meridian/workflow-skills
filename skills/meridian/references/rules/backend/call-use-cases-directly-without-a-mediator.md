## Call use cases directly without a mediator

**Default:** Call a use case through an explicit dependency; do not use MediatR, a command bus, or any ambient dispatcher, because they hide which code runs.

**When:** .NET backends; the same holds for a TypeScript command bus.

Bad: `await mediator.Send(new CreateFormCommand(name))`.
Good: `await createForm.ExecuteAsync(new CreateFormCommand(name), ct)`.
