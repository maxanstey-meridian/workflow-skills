## Declare default security in source

**Tooling:** Declare default OpenAPI security via assembly attributes in source (not only `--security`), and mark public endpoints anonymous.

**When:** .NET Rivet APIs. Mark public routes `.Anonymous()` (or `[AllowAnonymous]`/`[RivetAnonymous]` on `[RivetEndpoint]`). Generation and `--check` then share one document, catching mismatches as `RIV4008`.

Bad: Passing `--security bearer` only in the build script.
Good:
```csharp
[assembly: RivetSecurityScheme(...)]
[assembly: RivetGlobalSecurity(0)]
[assembly: RivetGlobalSecurityScheme(0, "bearer", new string[0])]
// and .Anonymous() on public routes such as sign-in
```

Links: [endpoint builder reference](https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md), [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
