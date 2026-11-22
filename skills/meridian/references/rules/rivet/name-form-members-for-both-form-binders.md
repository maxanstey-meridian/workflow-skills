## Name form members for both form binders

**Tooling:** Rename form input members with both `[DataMember(Name = …)]` (minimal API) and `[FromForm(Name = …)]` (MVC; on the parameter for positional records) — never `[JsonPropertyName]`.

**When:** Rivet routes with form inputs. Using only one triggers `RIV1100`. On MVC, `Name =` or `[Bind(Prefix = …)]` on the parameter prefixes all members except headers.

Bad: `[JsonPropertyName("file_name")] public string FileName { get; init; }` on a form record.
Good:
```csharp
[DataMember(Name = "file_name")]
[FromForm(Name = "file_name")]
public string FileName { get; init; }
```

Links: [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
