## Route Payload Ownership

Every direct request, success response, file input, and declared
`.Returns<T>(...)` payload belongs to the same top-level
`Contracts/<Feature>/` owner as its `[RivetContract]` route. Standard scalar and
collection wrappers and canonical shared error/pagination envelopes are leaves
or wrappers, not competing payload owners. The canonical envelopes are
`Common/` `ErrorResponse` and `PaginatedResponse<T>`;
[plumb](https://github.com/maxanstey-meridian/plumb)'s MER-RV-011 exempts
those names only.

Do not use Application commands/results, Domain models, controller-nested
types, or provider module contracts directly as route payload roots. Define a
transport-owned request or response and map at the handler edge. A transport
DTO may compose deliberately published module-contract or shared-kernel value
types, subject to `backend/dependency-rules.md#published-contract-closure`; direct route ownership
still remains with the transport contract.

Response records take every field positionally: no parameter defaults, no
`[RivetOptional]`, and no `JsonIgnore(WhenWritingNull/WhenWritingDefault)` (a
host-wide `DefaultIgnoreCondition` already makes the adapters throw). A settable
body property is a field too and moves into the parameter
list; the rule also covers each case a polymorphic base names with
`[JsonDerivedType]`. The compiler then finds every builder when a
field is added, and the client type matches what the server always sends (a
nullable field arrives as `null`, never missing). Requests may have optional
fields. The canonical `ErrorResponse` keeps
`Errors = null`; its shape is owned by `backend/error-envelope.md` (MER-BE-054).

Schema names are global and built from the simple type name, so every type a
contract reaches needs a unique one. Two `Response` records nested in different
feature classes, the same name in two namespaces, or `Result` beside `Result<T>`
stop generation (`RIV1007`). Name transport DTOs for their feature
(`InviteMemberResponse`), not for their slot.

Code `dotnet-rivet --from-openapi` writes is exempt: it is an external
contract's representation, not a hand-written transport contract. Imported
polymorphic records use `required` init members, which still make the compiler
find every builder of a required field.
