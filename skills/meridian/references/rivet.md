# Rivet (.NET)

Use this reference when designing or reviewing .NET APIs that use Rivet.

## What Rivet Is

Rivet analyzes C# with Roslyn and emits an OpenAPI 3.1 spec. Runtime terminals
construct and validate declared responses. Spec generation, implementation
coverage, and real HTTP behavior are separate checks; none substitutes for the others.
The spec plugs into the OpenAPI TypeScript ecosystem (openapi-typescript,
openapi-fetch, openapi-zod-client).

It is not your application architecture, domain model, or a reason to wrap
generated clients one-for-one. Module/use-case architecture still lives outside
Rivet. Rivet makes the API seam explicit and typed.

Docs: README https://github.com/maxanstey-meridian/rivet#readme, contracts
https://maxanstey-meridian.github.io/rivet/guides/contracts, builder reference
https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md, and RIV
diagnostics reference https://maxanstey-meridian.github.io/rivet/reference/diagnostics.

## Azure Functions

Use isolated-worker ASP.NET integration (`ConfigureFunctionsWebApplication`),
`HttpRequest`, `IActionResult`, and Rivet's `.ToActionResult()`.

Own separate trigger/public route constants in the contract:

```csharp
public const string TriggerRoute = "images/{format}";
public const string PublicRoute = "/api/" + TriggerRoute;
```

The trigger attribute consumes `TriggerRoute` **without a leading slash**;
`Define` consumes the complete public path. `host.json` defaults to the `api`
prefix; `extensions.http.routePrefix: ""` means `PublicRoute = "/" + TriggerRoute`.
A custom prefix must likewise appear in the contract. A leading slash in the
trigger can break ASP.NET-integrated Functions routing despite a valid spec.

The checker (0.42.0+) reads the project-adjacent `host.json`, honors
`AzureFunctionsJobHost__extensions__http__routePrefix`, and rejects leading slashes
in trigger routes; 0.41.0 and older hardcode `api`. Static checks cannot discover
remote deployment overrides. Align the check environment with deployment.

Besides the trigger's `HttpRequest`, a parameter with no binding attribute is
filled by name, ignoring case: a route value, else a query parameter, else a
top-level property of a JSON body; never a header, cookie, or form field. A name
nothing carries is `null` (a value type fails the call), so name each such
parameter after a route token, a declared query parameter, or a property of the
contract's JSON body; `--check` reports one the contract doesn't declare
(`RIV4006`, from 0.50.0).

The worked sample is
https://github.com/maxanstey-meridian/rivet/tree/main/samples/FunctionsApi (guide:
https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md);
the real-host gate is `task test:functions` in the rivet repo.
Use real HTTP tests for the host/worker routing and serialization boundary.

## Contract Location

Contracts live in a top-level `Contracts/{Module}/` folder with their DTOs
alongside — never inside `Modules/`.

- the contract owns route constants: `public const string CreateRoute = "/api/transcriptions";`
- minimal APIs reference them via `Contract.X.Route` (`--check` resolves it from 0.48.0, `MapGroup` prefixes included); controllers use the contract's `const string` route in attributes (a runtime `.Route` property is not an attribute constant)
- never a literal route string in `Map*(...)` or `[Http*(...)]` — routes come from the contract
- bootstrap endpoints (`Program.cs` health, root) are the one exception

```text
Contracts/
└── Transcriptions/
    ├── TranscriptionsContract.cs   # [RivetContract]: route constants + Define.* fields
    └── TranscriptionsModels.cs     # the request/response records those routes carry
```

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
types, subject to the published-contract closure rule; direct route ownership
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
`Errors = null`; its shape is owned by backend-pa-vsa.md "Error Envelope" (MER-BE-054).

Schema names are global and built from the simple type name, so every type a
contract reaches needs a unique one. Two `Response` records nested in different
feature classes, the same name in two namespaces, or `Result` beside `Result<T>`
stop generation (`RIV1007`). Name transport DTOs for their feature
(`InviteMemberResponse`), not for their slot.

Code `dotnet-rivet --from-openapi` writes is exempt: it is an external
contract's representation, not a hand-written transport contract. Imported
polymorphic records use `required` init members, which still make the compiler
find every builder of a required field.

## Endpoint Composition

Minimal API groups expose `MapXEndpoints(this IEndpointRouteBuilder ...)` and
`Program.cs` composes every such group in its project. `Program.cs` contains no
inline business handlers; literal `/`, `/health`, and `/api/health` bootstrap
handlers are the root/health exception. `MapGroup` itself is composition, not an
inline handler.

The receiver rule validates only the extension target: the ordinary or fully
qualified `Microsoft.AspNetCore.Routing.IEndpointRouteBuilder` type is valid;
`WebApplication` is not. It does not by itself prove file placement, naming, or
that `Program.cs` composed the group.

## Generated Output

Generated Rivet output lives in a workspace package, `packages/contracts`,
consumed through its `exports` map (`@<scope>/contracts`, or a `./client`
subpath), never an in-app directory.

- generated code is read-only; exclude from lint
- regenerate via the repo's task convention (`task generate`, `pnpm rivet`, or `dotnet rivet --project ... --output ...`)
- commit regenerated output with the contract change that caused it
- `--verify` is the CI drift gate

Source of the standard facade: https://github.com/maxanstey-meridian/rivet-ts/blob/main/src/infrastructure/codegen/client-package-emitter.ts

## TypeScript Client Package

The frontend contract package has:

- `generated/openapi.json` — OpenAPI 3.1 emitted from the authored Rivet contract
- `generated/schema.d.ts` — `openapi-typescript` output over that spec
- `src/index.ts` — the hand-owned client facade consumed by UI apps

Standard facade shape:

```ts
import createOpenApiClient, { type Client, type ClientOptions } from "openapi-fetch";
import type { paths } from "../generated/schema.js";

export type { components, paths } from "../generated/schema.js";

export type RivetFetch = (input: Request) => Promise<Response>;
export type RivetConfig = Omit<ClientOptions, "baseUrl" | "fetch"> & {
  readonly baseUrl?: string;
  readonly fetch?: RivetFetch;
};
export type RivetClient = Client<paths>;

export const createClient = (config: RivetConfig = {}): RivetClient =>
  createOpenApiClient<paths>(config);

export let client: RivetClient = createOpenApiClient<paths>();

export const configureRivet = (config: RivetConfig): void => {
  client = createClient(config);
};
```

Rules:
- UI imports `client`, `createClient`, `configureRivet`, and DTO types from the contracts package
- UI does not create `openapi-fetch` clients directly
- regeneration updates `generated/`; the facade is hand-owned after scaffold
- do not wrap the generated client one-for-one in a fake API service

## Frontend Result Handling

The current v2 client is an `openapi-fetch` facade. Capture its `{ data, error,
response }` result and inspect the error channel or response status explicitly:

```ts
const result = await client.GET("/api/mappings");
if (result.response.status === 404) return null;
if (result.error !== undefined) return { ok: false as const, error: result.error };
return { ok: true as const, data: result.data };
```

Do not narrow on `result.data` truthiness: valid payloads may be `false`, `0`,
an empty string, or null. `try/catch` is for transport/network failure only;
never use catch for HTTP status branching.

Legacy Rivet v1 clients use `{ unwrap: false }` plus `.isOk()` /
`.isNotFound()`. Do not copy that API into v2 code.

## Practical Rules

- Contract first, in top-level `Contracts/{Module}/`; route constants belong there.
- Request/response roots belong to that same transport feature.
- Execute use cases normally; bind inputs and map results to contract terminals.
- Use first-party `.ToResult()` / `.ToActionResult()` at the host edge.
- Use `.AcceptsFile()` for multipart uploads; `.AcceptsBinary()` for raw streams.
- Use file terminals with explicit MIME selection when several formats are declared.
- Use the writer `File(...)` for streamed bodies, not native stream results.
- Bind route/query/header/form enums as plain enums, unrenamed `JsonStringEnumConverter<T>` (not on Functions), or a parsed `string`.
- Name a form input's member for both form binders: `[DataMember(Name = ...)]` (the minimal-API form mapper, which ignores a member's `[FromForm(Name = ...)]` and never prefixes) and `[FromForm(Name = ...)]` (MVC; on a positional record, on the parameter, not `[property:]`). `[JsonPropertyName]` never names a form part, and one rename without the other is `RIV1100` on a contract. On MVC a `Name =` (or `[Bind(Prefix = ...)]`) on the parameter prefixes every member but headers. Prefer the `{ get; init; }` form for a form input: the minimal-API form mapper refuses a positional record missing any constructor parameter, so on a contract every constructor-bound part is emitted `required`, nullable and `[RivetOptional]` ones included. A part that's really optional belongs in an init property.
- Declare the document's default security in source (`[assembly: RivetSecurityScheme(...)]`, `[assembly: RivetGlobalSecurity(0)]`, `[assembly: RivetGlobalSecurityScheme(0, "bearer", new string[0])]`), not only with `--security`, so generation and `--check` read the same spec; then mark the endpoints anyone may call `.Anonymous()` (on a `[RivetEndpoint]` action, `[AllowAnonymous]` or `[RivetAnonymous]`).
- Apply authorization unconditionally (`[Authorize]`, an `AuthorizeFilter` in `MvcOptions.Filters`, `.RequireAuthorization()`, or a fallback policy). A development environment without real authentication gets a development authentication handler that signs the dev user in, not an `if` around `RequireAuthorization()`.
- Give every route token a typed declaration: an input property, `.Parameter<T>(name, "path", ...)`, or a type constraint (`RIV1019`).
- Run both coverage (`--check` without `--output`) and spec drift (`--verify`) gates.
- Run real-host tests where transport integration is part of the change.
- Keep application architecture and generated-client policy separate from Rivet.
- A `[RivetContract]` declaration is a static class containing only `const string` route constants and `static readonly RouteDefinition...` fields built via the `Define` factory. It has no methods, properties, instance state, or other fields.
- `[RivetClient]` on a controller class surfaces every HTTP action in it; prefer `[RivetEndpoint]` per action so only deliberate operations are published.
- Do not copy legacy `.Invoke(...)`, `RivetResult<T>`, or `.SkipValidation()` examples into current code.
- Functions-specific exception handling must be integrated and verified with that host if required.
- Rivet does not enforce serialized JSON shape, member validation constraints, request parsing/binding, optional headers, auth policies, or file byte contents at runtime. Those remain host/application responsibilities. Handlers returning native results outside the terminals bypass Rivet's runtime checks. Coverage is static analysis, not proof that every request branch or deployment configuration is correct.

## Anti-patterns

- duplicating route literals in handlers instead of using contract constants
- treating OpenAPI security declarations as authentication enforcement (`--check`'s `RIV4008` catches a spec and a handler that disagree, but the handler's authorization is what enforces)
- replacing first-party response adapters with hand-written bridges
- bypassing terminals while claiming Rivet validated the response
- wrapping the generated client in another identical service layer
- mixing domain/application concerns into the contract class
- using `.FormEncoded()` for multipart input
- calling new source-only APIs against an older pinned package
- a handler whose only terminals are built inside helpers, or handed to helpers that don't adapt them (`MissingImplementation`)
- a Rivet case converter (or a renaming `[JsonStringEnumMemberName]`) on an enum bound from route/query/header/form
- native `Results.Stream`/`PushStreamContent` for a contract file instead of the writer terminal
- registering converters, a naming policy or other wire-changing settings in host JSON options (the adapters throw)
- `[JsonConverter]` on a property, or one Rivet can't model on a type (`RIV1111`); pin a primitive's wire with `[RivetSchemaType]` instead
- `[JsonDerivedType]` with an int tag or none (`RIV1014`); polymorphic tags are strings
- declaring `Authorization`, `Accept`, or `Content-Type` as a header input, or `Content-Type` as a response header (`RIV2009`; a response's media type is `.ProducesContentType(...)`)
