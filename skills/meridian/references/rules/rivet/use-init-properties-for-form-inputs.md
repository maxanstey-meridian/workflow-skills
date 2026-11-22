## Use init properties for form inputs

**Tooling:** Model form inputs with `{ get; init; }` properties, keeping optional parts as init properties rather than constructor parameters.

**When:** Rivet routes with form inputs — the minimal-API form mapper rejects missing constructor parameters, making every constructor-bound part `required` (even nullable or `[RivetOptional]`).

Bad: `record UploadForm(IFormFile File, string? Note)`
Good:
```csharp
public class UploadForm
{
    public IFormFile File { get; init; }
    public string? Note { get; init; }
}
```
