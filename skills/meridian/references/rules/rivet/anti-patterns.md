## Anti-patterns

- duplicating route literals in handlers instead of using contract constants
- treating OpenAPI security declarations as authentication enforcement (`--check`'s `RIV4008` catches a spec and a handler that disagree, but the handler's authorization is what enforces)
- replacing first-party response adapters with hand-written bridges
- bypassing terminals while claiming Rivet validated the response
- wrapping the generated client in another identical service layer
- mixing domain/application concerns into the contract class
- using `.FormEncoded()` for multipart input
- calling new source-only APIs against an older pinned package
- a handler whose only terminals are built inside helpers, or handed to helpers that don't adapt them (`MissingImplementation`)
- a Rivet case converter (or a renaming `[JsonStringEnumMemberName]`) on an enum bound from route/query/header/form
- native `Results.Stream`/`PushStreamContent` for a contract file instead of the writer terminal
- registering converters, a naming policy or other wire-changing settings in host JSON options (the adapters throw)
- `[JsonConverter]` on a property, or one Rivet can't model on a type (`RIV1111`); pin a primitive's wire with `[RivetSchemaType]` instead
- `[JsonDerivedType]` with an int tag or none (`RIV1014`); polymorphic tags are strings
- declaring `Authorization`, `Accept`, or `Content-Type` as a header input, or `Content-Type` as a response header (`RIV2009`; a response's media type is `.ProducesContentType(...)`)
