## Tag polymorphic types with string discriminators

**Tooling:** Every `[JsonDerivedType]` carries a string tag, never an integer tag and never none.

**When:** Polymorphic transport contract types (the request and response records in `Contracts/<Feature>/`) for Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response; an integer or missing tag is `RIV1014`.

Bad: `[JsonDerivedType(typeof(TextAnswer), 1)]`
Good: `[JsonDerivedType(typeof(TextAnswer), "text")]`

Links: [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
