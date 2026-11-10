## Call only APIs the pinned Rivet version has

**Tooling:** Use only the Rivet APIs the project's pinned package version provides; raise the pin before calling a newer source-only API.

**When:** .NET APIs that use Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response.

Bad: calling `.AcceptsBinary()` while the project pins a Rivet package version that lacks it.
Good: the package reference raised to a version that has `.AcceptsBinary()`, in the same change that calls it.
