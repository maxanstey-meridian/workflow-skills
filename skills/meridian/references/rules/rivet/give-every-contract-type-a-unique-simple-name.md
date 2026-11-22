## Give every contract type a unique simple name

**Tooling:** Give every type reachable from a transport contract a unique simple name across the API, named for its feature rather than its slot.

**When:** .NET Rivet APIs — schema names are global by simple name, so colliding nested `Response` records, duplicate names across namespaces, or `Result` beside `Result<T>` fail generation (`RIV1007`).

Bad: A `Response` record nested in both `InviteMember` and `RemoveMember`.
Good: `InviteMemberResponse` and `RemoveMemberResponse`.

Links: [RIV diagnostics reference](https://maxanstey-meridian.github.io/rivet/reference/diagnostics)
