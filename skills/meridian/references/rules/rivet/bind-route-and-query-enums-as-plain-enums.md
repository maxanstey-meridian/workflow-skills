## Bind route and query enums as plain enums

**Tooling:** Bind route, query, header, or form enums as plain enums, unrenamed `JsonStringEnumConverter<T>`, or parsed `string` — never with a Rivet case converter or renaming `[JsonStringEnumMemberName]`.

**When:** Rivet routes with enum inputs outside the JSON body (`JsonStringEnumConverter<T>` is unavailable on Azure Functions).

Bad: `public enum Status { [JsonStringEnumMemberName("in-progress")] InProgress }` bound from a query value.
Good: `public enum Status { InProgress }` bound as a plain enum, or taken as `string` and parsed in the handler.
