## Return files through the file terminal and writer

**Tooling:** Return files through the contract's file terminal (explicitly picking the MIME type when multiple are declared) and stream with `File(...)`, never `Results.Stream` or `PushStreamContent`.

**When:** Rivet routes returning files.

Bad: `return Results.Stream(stream, "application/pdf")`
Good: Returning the contract's file terminal with the PDF MIME type and streaming via `File(...)`.
