## Return files through the file terminal and writer

**Tooling:** Return a file through the contract's file terminal (the typed value Rivet gives a handler for a declared file response), choosing the MIME type explicitly when several are declared, and stream a body with the writer `File(...)`, never `Results.Stream` or `PushStreamContent`.

**When:** Rivet routes that return a file (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response).

Bad: `return Results.Stream(stream, "application/pdf")`
Good: the handler returns the contract's file terminal with the PDF MIME type chosen explicitly, and streams the body through the writer `File(...)`.
