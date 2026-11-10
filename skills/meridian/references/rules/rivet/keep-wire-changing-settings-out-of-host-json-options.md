## Keep wire-changing settings out of host JSON options

**Tooling:** Do not register converters, a naming policy, a `DefaultIgnoreCondition`, or any other wire-changing setting in the host's JSON options, because Rivet's response writers throw.

**When:** .NET hosts that serve Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response).

Bad: `options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;`
Good: the host's JSON options with no wire-changing setting.
