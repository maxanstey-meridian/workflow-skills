## Give every contract type a unique simple name

**Tooling:** Every type a transport contract reaches has a simple name that is unique across the API, named for its feature rather than its slot.

**When:** .NET APIs that use Rivet, which reads C# and emits the OpenAPI document and typed terminals for each declared response. Schema names are global and built from the simple type name, so two nested `Response` records, one name in two namespaces, or `Result` beside `Result<T>` stop generation (`RIV1007`).

Bad: a `Response` record nested in both `InviteMember` and `RemoveMember`.
Good: `InviteMemberResponse` and `RemoveMemberResponse`.

Links: [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
