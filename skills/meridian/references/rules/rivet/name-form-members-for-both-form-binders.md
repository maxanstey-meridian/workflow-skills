## Name form members for both form binders

**Tooling:** Rename a form input's member with both `[DataMember(Name = …)]` (read by the minimal-API form mapper) and `[FromForm(Name = …)]` (read by MVC; on a positional record, put it on the parameter), and never name a form part with `[JsonPropertyName]`.

**When:** Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response) with form inputs. One rename without the other is `RIV1100`. On MVC a `Name =` or `[Bind(Prefix = …)]` on the parameter prefixes every member except headers.

Bad: `[JsonPropertyName("file_name")] public string FileName { get; init; }` on a form record.
Good:
```csharp
[DataMember(Name = "file_name")]
[FromForm(Name = "file_name")]
public string FileName { get; init; }
```

Links: [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
