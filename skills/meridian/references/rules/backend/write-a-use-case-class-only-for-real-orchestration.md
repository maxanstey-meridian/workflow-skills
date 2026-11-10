## Write a use case class only for real orchestration

**Default:** Write a use case class (the Application code for one operation) when the flow coordinates several side effects, has sequencing that matters, or is a capability worth naming; for simple procedural behaviour, a direct service method is enough.

**When:** Adding an operation to a module (one feature's folder under `Modules/` or `src/modules/`) on .NET or TypeScript. The test: does the class make the flow clearer and protect business behaviour? If not, simplify.

Bad: `GetFormNameUseCase` wrapping one repository call.
Good: the query called directly.
