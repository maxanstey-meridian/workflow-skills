## Use init properties for form inputs

**Tooling:** Write a form input as a type with `{ get; init; }` properties, and put a part that is really optional in an init property, not a constructor parameter.

**When:** Rivet routes (Rivet reads C# and emits the OpenAPI document and typed terminals for each declared response) with form inputs. The minimal-API form mapper refuses a positional record that is missing any constructor parameter, so every constructor-bound part is emitted `required`, nullable and `[RivetOptional]` ones included.

Bad: `record UploadForm(IFormFile File, string? Note)`
Good:
```csharp
public class UploadForm
{
    public IFormFile File { get; init; }
    public string? Note { get; init; }
}
```
