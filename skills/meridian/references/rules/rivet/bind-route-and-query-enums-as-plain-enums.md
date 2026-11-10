## Bind route and query enums as plain enums

**Tooling:** Bind an enum from a route, query, header, or form value as a plain enum, an unrenamed `JsonStringEnumConverter<T>`, or a parsed `string`; never with a Rivet case converter or a renaming `[JsonStringEnumMemberName]`.

**When:** Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response) with enum inputs outside the JSON body. `JsonStringEnumConverter<T>` is not available on Azure Functions.

Bad: `public enum Status { [JsonStringEnumMemberName("in-progress")] InProgress }` bound from a query value.
Good: `public enum Status { InProgress }` bound as a plain enum, or the query value taken as a `string` and parsed in the handler.
