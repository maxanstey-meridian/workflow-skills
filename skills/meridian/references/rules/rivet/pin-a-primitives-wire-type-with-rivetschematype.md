## Pin a primitive's wire type with RivetSchemaType

**Tooling:** Fix how a primitive appears on the wire with `[RivetSchemaType]`, not with `[JsonConverter]` on a property or a converter Rivet cannot model on a type.

**When:** Transport contract types (the request and response records in `Contracts/<Feature>/`) for Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response; `[JsonConverter]` on a property, or a converter Rivet cannot model, is `RIV1111`.

Bad: `[JsonConverter(typeof(DateOnlyConverter))] DateOnly Due`
Good: `Due` carries `[RivetSchemaType]` with the wire type, not a `[JsonConverter]`.

Links: [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
