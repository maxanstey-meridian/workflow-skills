## Declare default security in source

**Tooling:** Declare the document's default security in source with the assembly attributes, not only with `--security`, and mark the endpoints anyone may call as anonymous.

**When:** .NET APIs that use Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response. Anonymous is `.Anonymous()`, or on a `[RivetEndpoint]` action `[AllowAnonymous]` or `[RivetAnonymous]`. Generation and `--check` then read the same document, and `--check` reports a document and a handler that disagree as `RIV4008`.

Bad: security passed only as `--security bearer` in the build script.
Good:
```csharp
[assembly: RivetSecurityScheme(...)]
[assembly: RivetGlobalSecurity(0)]
[assembly: RivetGlobalSecurityScheme(0, "bearer", new string[0])]
// and .Anonymous() on a route anyone may call, such as sign-in
```

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md), [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
