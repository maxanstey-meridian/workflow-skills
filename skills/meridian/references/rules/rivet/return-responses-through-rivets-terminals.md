## Return responses through Rivet's terminals

**Tooling:** A handler runs the use case, maps its result to the contract's terminal (the typed value Rivet gives a handler for one declared response), and returns it with Rivet's own `.ToResult()` or `.ToActionResult()`; never a native result, a hand-written bridge, or a handler whose only terminals are built inside helpers or handed to helpers that do not adapt them.

**When:** .NET handlers for Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response). A result filter may read `StatusCode` and `Value` of the `RivetActionResult`, but never builds a result from them or writes them to the response. A handler whose only terminals are built inside helpers, or handed to helpers that do not adapt them, is reported as `MissingImplementation`.

Bad: `return Results.Json(dto, statusCode: 201)`
Good: the handler maps the use case's result to the contract's 201 terminal and returns it with `.ToResult()`.
