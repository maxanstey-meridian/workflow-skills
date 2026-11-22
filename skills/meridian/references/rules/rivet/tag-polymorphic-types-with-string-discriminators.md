## Tag polymorphic types with string discriminators

**Tooling:** Give every `[JsonDerivedType]` a string tag — never an integer or omitted tag.

**When:** Polymorphic Rivet contract types (`Contracts/<Feature>/`); integer or missing tags fail with `RIV1014`.

Bad: `[JsonDerivedType(typeof(TextAnswer), 1)]`
Good: `[JsonDerivedType(typeof(TextAnswer), "text")]`

Links: [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
