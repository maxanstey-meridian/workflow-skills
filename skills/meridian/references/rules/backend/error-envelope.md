## Error Envelope

The canonical API error shape is one general envelope:

```csharp
public sealed record ErrorResponse(string Code, string Message,
    IReadOnlyDictionary<string, string[]>? Errors = null);
```

One type serves every declared failure —
`.Returns<ErrorResponse>(422)` in contracts and one conversion at the transport
edge. No `*Dto` suffix, and no special-purpose variants like
`ValidationErrorDto`: validation failures are the same envelope with `Errors`
populated. The pipeline is: use case returns a declared failed result → the
transport edge maps it to `ErrorResponse` once → the frontend matches on
`Code`. Undeclared exceptions go through global exception handling and become
a 5xx response. Do not support both exceptions and failed results for the same
expected outcome.
