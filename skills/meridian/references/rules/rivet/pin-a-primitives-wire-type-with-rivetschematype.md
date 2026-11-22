## Pin a primitive's wire type with RivetSchemaType

**Tooling:** Pin a primitive's wire type with `[RivetSchemaType]`, never with `[JsonConverter]` on a property or a converter Rivet cannot model.

**When:** Rivet transport contract types (`Contracts/<Feature>/`); property `[JsonConverter]` or unmodelled converters trigger `RIV1111`.

Bad: `[JsonConverter(typeof(DateOnlyConverter))] DateOnly Due`
Good: `[RivetSchemaType]` on `Due` specifying the wire type.

Links: [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
