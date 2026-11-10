## Use one error envelope for every declared failure

**Default:** Every declared failure uses the one `ErrorResponse(Code, Message, Errors?)` type, with no `Dto` suffix and no special-purpose variant, so a validation failure is the same envelope with `Errors` filled and the frontend matches on `Code`.

**When:** API error responses on .NET: the transport contract (the route definitions and wire types in top-level `Contracts/<Feature>/`) declares `.Returns<ErrorResponse>(422)` in Rivet, and one conversion at the transport edge (the code that turns a result into a response) builds the envelope.

Bad: A separate `ValidationErrorDto` returned for 422 responses.
Good:
```csharp
public sealed record ErrorResponse(string Code, string Message,
    IReadOnlyDictionary<string, string[]>? Errors = null);
```
