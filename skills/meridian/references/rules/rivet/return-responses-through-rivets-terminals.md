## Return responses through Rivet's terminals

**Tooling:** Map the use case's result to the contract's terminal and return it via `.ToResult()` or `.ToActionResult()` — never a native result, hand-written bridge, or terminals built only inside unadapted helpers.

**When:** .NET Rivet handlers. Result filters may inspect `RivetActionResult.StatusCode`/`Value` but never build or write a response from them. Terminals hidden inside helpers report `MissingImplementation`.

Bad: `return Results.Json(dto, statusCode: 201)`
Good: Mapping the result to the contract's 201 terminal and returning `.ToResult()`.
