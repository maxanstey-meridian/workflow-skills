## Take every response field positionally

**Tooling:** A response record takes every field as a positional parameter, with no parameter defaults, no `[RivetOptional]`, no `JsonIgnore(WhenWritingNull/WhenWritingDefault)`, and no settable body property, so the compiler finds every builder when a field is added.

**When:** Response records in hand-written transport contracts (the `[RivetContract]` classes and records in `Contracts/<Feature>/`) for Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response; each case a polymorphic base names with `[JsonDerivedType]` is included. Requests may have optional fields. The shared `ErrorResponse` keeps `Errors = null`. Code `dotnet-rivet --from-openapi` writes is exempt; its polymorphic records use `required` init members instead.

Bad: `record FormResponse(Guid Id, string? Note = null)`
Good: `record FormResponse(Guid Id, string? Note)`
