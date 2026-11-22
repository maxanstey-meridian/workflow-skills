## Take every response field positionally

**Tooling:** Take every response record field as a positional parameter with no defaults, `[RivetOptional]`, `JsonIgnore(WhenWritingNull/WhenWritingDefault)`, or settable body properties, so adding a field flags every call site at compile time.

**When:** Hand-written Rivet response records (including `[JsonDerivedType]` cases). Requests may have optional fields; shared `ErrorResponse` keeps `Errors = null`; `dotnet-rivet --from-openapi` output is exempt (polymorphic records use `required` init members).

Bad: `record FormResponse(Guid Id, string? Note = null)`
Good: `record FormResponse(Guid Id, string? Note)`
