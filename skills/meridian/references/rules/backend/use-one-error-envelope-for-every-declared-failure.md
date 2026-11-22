## Use one error envelope for every declared failure

**Default:** Use one `ErrorResponse(Code, Message, Errors?)` envelope for every declared failure — no `Dto` suffix, no special-purpose variants; validation failures populate `Errors`, and the frontend matches on `Code`.

**When:** .NET API error responses: declare `.Returns<ErrorResponse>(422)` in Rivet and build the envelope in one transport-edge converter.

Bad: Returning a separate `ValidationErrorDto` for 422 responses.
Good:
```csharp
public sealed record ErrorResponse(string Code, string Message,
    IReadOnlyDictionary<string, string[]>? Errors = null);
```
