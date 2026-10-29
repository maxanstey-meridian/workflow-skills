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
https://maxanstey-meridian.github.io/rivet/guides/contracts, and builder reference
https://github.com/maxanstey-meridian/rivet/blob/main/docs/reference/endpoint-builder.md.

## Two Ways In

### 1. Contract-first (`[RivetContract]`) — preferred

A `[RivetContract]` declaration is a static class containing only `const string`
route constants and `static readonly RouteDefinition...` fields built via the
`Define` factory. It has no methods, properties, instance state, or other fields.
Rivet reads each initializer from source, so it must be one `Define.*` chain whose
arguments are compile-time constants: a helper call, another field, a variable
argument or an endpoint declared as a property stops generation (`RIV1113`), and
so does a field that isn't `static readonly` (`RIV1001`):

```csharp
[RivetContract]
public static class MembersContract
{
    public const string BaseRoute = "/api/members";

    public static readonly RouteDefinition<PaginatedResponse<MemberDto>> List =
        Define.Get<PaginatedResponse<MemberDto>>(BaseRoute)
            .Description("List all team members");

    public static readonly RouteDefinition<InviteMemberRequest, InviteMemberResponse> Invite =
        Define.Post<InviteMemberRequest, InviteMemberResponse>(BaseRoute)
            .Status(201)
            .Returns<ErrorResponse>(422, "Validation failed")
            .Secure("admin");
}
```

Handlers bind declared inputs with `.Bind(input)` and construct responses with
`.Success(...)`, `.Error(...)`, or `.File(...)`. Application execution stays
ordinary C#; the contract owns response construction, not the handler body.

### 2. Annotate existing controllers (`[RivetEndpoint]`)

Mark the endpoints you want surfaced — the operation is derived from the real
transport shape (routes, params, bodies, response types):

```csharp
[RivetEndpoint]
[HttpGet("{id:guid}")]
[ProducesResponseType(typeof(TaskDetailDto), StatusCodes.Status200OK)]
[ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
public async Task<IActionResult> Get(Guid id, CancellationToken ct) { ... }
```

`[RivetClient]` on a controller class surfaces every HTTP action in it; prefer
`[RivetEndpoint]` per action so only deliberate operations are published.

## Route Definition API

### Factories

| Factory | Variants | Default success |
|---|---|---|
| `Define.Get(route)` | untyped, `<TOutput>`, `<TInput, TOutput>` | 200 |
| `Define.Head(route)` / `Define.Options(route)` | untyped, `<TOutput>`, `<TInput, TOutput>` | 200 |
| `Define.Post(route)` | untyped, `<TOutput>`, `<TInput, TOutput>` | 201 |
| `Define.Put(route)` / `Define.Patch(route)` | untyped, `<TOutput>`, `<TInput, TOutput>` | 200 |
| `Define.Delete(route)` | untyped, `<TOutput>`, `<TInput, TOutput>` | 204 untyped, 200 typed |
| `Define.File(route)` | untyped, `<TInput>` | 200, GET, `application/octet-stream` |

Untyped definitions can become input-only via `.Accepts<TInput>()` (e.g. a PUT
that takes a body and returns 204), producing an `InputRouteDefinition<TInput>`.

### Builder methods

All return the definition for chaining.

| Method | Effect |
|---|---|
| `.Summary(text)` / `.Description(text)` | OpenAPI `summary` / `description` |
| `.Status(code)` | Override the success status. Once only. |
| `.Returns<T>(status[, description])` | Declare an additional typed response. Each status once. |
| `.Returns(status[, description])` | Same, without a payload type. |
| `.WithResponseHeader(status, name[, description][, required:])` | Response header on a declared status (an undeclared one is `RIV1017`). With `required: true` the adapter checks it: a response at that status written without the header throws `RivetContractViolationException`. Set it on `HttpContext.Response.Headers` before returning; a header added in `OnStarting` arrives too late to count. |
| `.WithResponseHeader(name[, description][, required:])` | Same, targeting the success status. |
| `.Secure(scheme, scopes...)` | One way in: a security alternative needing this scheme. A second `.Secure` is another alternative (OR). Define schemes with `--security` or `[assembly: RivetSecurityScheme]`. |
| `.AndSecure(scheme, scopes...)` | Adds a scheme the same caller also needs (AND), to the alternative before it. |
| `.OrAnonymous()` | Credentials optional: adds the empty alternative. |
| `.Anonymous()` | No auth (`security: []`). Contradictory calls (`.Anonymous()` with `.Secure()`, `.AndSecure()` with nothing to join) fail with `RIV1114`. |
| `.QueryAuth(name = "token")` | Auth token as required query param — for media players that cannot set headers. |
| `.FormEncoded()` | Request body is `application/x-www-form-urlencoded`. |
| `.AcceptsFile()` | Request body is `multipart/form-data` with a binary file part. **There is no `.Multipart()` — this is it.** |
| `.AcceptsBinary(contentType = "application/octet-stream")` | Request body is raw bytes. Spec-only; `TInput` properties lower to route/query params. Mutually exclusive with `.AcceptsFile()` / `.FormEncoded()`. |
| `.ProducesFile(contentType = "application/octet-stream")` | Response is a binary download. |
| `.AcceptsContentType(mediaType)` | Declared media type for a non-JSON request body (e.g. `"text/plain"`). Schema unchanged. |
| `.ProducesContentType(mediaType)` | Declared media type for a non-JSON success response (e.g. `"text/html"`). |
| `.RequestExampleJson(json, ...)` / `.ResponseExampleJson(status, json, ...)` | Attach examples. Runtime no-ops — Roslyn reads them at generation time only. |

Definitions publish on the first `Bind`, `Success`, `Error`, or `File`; builder
mutators throw after publication. Configure fully in the `static readonly` initializer.

An endpoint with no JSON body (GET, DELETE, `.AcceptsBinary()`) lowers its input's
properties to route and query parameters, so that input must be a record with one
property per parameter; a dictionary, collection or scalar stops generation
(`RIV1020`). A header input named `Accept`, `Content-Type` or `Authorization` is
refused too (`RIV2009`), because OpenAPI ignores those as parameters: use
`.AcceptsContentType`/`.ProducesContentType` for media types and a security scheme
for credentials.

## File Uploads / Multipart

On controller endpoints, an `IFormFile` parameter (or collection) makes the
operation multipart automatically. On contracts, `.AcceptsFile()` marks it
explicitly:

```csharp
public static readonly RouteDefinition<UploadRequest, UploadResponse> Upload =
    Define.Post<UploadRequest, UploadResponse>("/api/files")
        .AcceptsFile();
```

`.AcceptsBinary(contentType)` declares a raw byte-stream body (chunked uploads,
audio, etc.). `TInput` properties bind to route/query params, not a JSON body.
Mutually exclusive with `.AcceptsFile()` and `.FormEncoded()`.

`Define.File(route)` declares a binary download endpoint (GET,
`application/octet-stream` unless overridden via `.ProducesFile(mediaType)`).

## Implementing Contracts

### Controller or Functions ASP.NET integration

```csharp
var endpoint = MembersContract.Invite.Bind(request);
var result = await useCase.ExecuteAsync(new InviteMemberCommand(request.Email), ct);
if (result.IsFailed)
{
    return endpoint.Error(422, result.ToErrorResponse()).ToActionResult();
}
return endpoint.Success(new InviteMemberResponse(result.Value.Id)).ToActionResult();
```

`ToErrorResponse` above is the application's explicit mapping to its declared
error DTO, not a Rivet API. Without an input type, call the terminals directly
on the contract field. Bodyless success/error responses use `.Success()` and
`.Error(status)`.

A result filter may read the `StatusCode` and `Value` of the `RivetActionResult`
that `.ToActionResult()` returns. Building a result from them, or writing them to
the response itself, is a hand-written bridge: let Rivet write the response.

### Handler shapes `--check` follows

Guide: https://maxanstey-meridian.github.io/rivet/guides/contract-coverage

The handler must itself return a terminal through the first-party adapter. From
0.48.0 these shapes count:

- an adapter per switch/`?:` arm, or one adapter around the whole switch/`?:`;
- a local holding a terminal (or a switch of them), then adapted;
- lambda arms passed straight to the call the handler returns, sync or async,
  through `await`, `ConfigureAwait` and casts:

```csharp
var endpoint = TasksContract.Get.Bind(input);
return outcome.Match(
    found: task => endpoint.Success(task).ToActionResult(),
    missing: reason => Done(endpoint.Refuse(reason)));
```

`Refuse` and `Done` stand for the app's own error helpers; they aren't Rivet APIs.

A `Match` arm named first still counts: a lambda held in a local
(`var found = (TaskDto t) => ...;`) or a local function passed as
`outcome.Match(found, ...)`. A lambda buried in an argument
(`Ok(items.Select(t => ...))`) and a `Match` whose result is discarded are not
followed. In a minimal API the handler is the lambda handed to `Map*`, not a
`Match` arm inside it.

Helpers may own the error paths, and a helper may take the bound endpoint: a
`.Bind` passed to a helper on the returned path is not an `OrphanedBinding`. But a
terminal that reaches the adapter only through a helper never gives coverage, so
keep at least one terminal (usually `.Success`) returned by the handler itself.
A handler whose every arm goes through helpers is `MissingImplementation`.

### Minimal APIs

Use the same terminals, then `.ToResult()` at the transport edge. All terminals
return the non-generic `RivetResult`. Use Rivet's first-party adapters; do not
recreate them as custom `ObjectResult`/`Results.Json` bridges. Do not copy legacy
`.Invoke(...)`, `RivetResult<T>`, or `.SkipValidation()` examples into current code.

For an ordinary ASP.NET app, the bundled violation handler can emit structured
500 responses:

```csharp
builder.Services.AddExceptionHandler<RivetContractViolationHandler>();
builder.Services.AddProblemDetails();
app.UseExceptionHandler();
```

That ASP.NET middleware recipe is not automatically a Functions worker exception
pipeline. Functions-specific exception handling must be integrated and verified
with that host if required.

## Runtime Validation Scope

Guide: https://maxanstey-meridian.github.io/rivet/guides/runtime-validation

Response terminals enforce declared statuses, payload types, body presence and
binary versus textual/JSON representations. Mismatches throw
`RivetContractViolationException`. Concrete payload declarations reject unexpected
subtypes; declared interfaces/abstract types and registered JSON polymorphism
have their own supported subtype rules. Both first-party adapters preserve the
constructed response and guard incompatible host response state.

The adapters also check two promises the spec makes: required response headers
(above), and the host's JSON options. The spec assumes System.Text.Json's web
defaults, so another naming policy or `DictionaryKeyPolicy`, anything in
`Converters` (Rivet's enum converters included), number handling that writes
strings, an ignore condition, `IgnoreReadOnlyProperties`/`Fields`, `IncludeFields`,
a `ReferenceHandler`, `UnmappedMemberHandling.Disallow`,
`RespectRequiredConstructorParameters`, a resolver that isn't the default or a
source-generated context (modifiers included), or a context with
`UseStringEnumConverter = true` makes `.ToResult()`/`.ToActionResult()` throw,
naming each difference. Declare wire behaviour on the types instead. Settings that
only loosen reading or change formatting (case-insensitive names, trailing commas,
indenting, the encoder) are left alone.

Rivet does not enforce serialized JSON shape, member validation constraints,
request parsing/binding, optional headers, auth policies, or file byte contents at
runtime. Those remain host/application responsibilities. Handlers returning native
results outside the terminals bypass Rivet's runtime checks. Coverage is static
analysis, not proof that every request branch or deployment configuration is correct.

## Enum Parameters

Details: https://github.com/maxanstey-meridian/rivet/blob/main/docs/misc/limitations.md#enum-parameters-are-bound-by-aspnet

Rivet's string-enum converters (`Rivet{LowerCase,CamelCase,SnakeCase,Kebab}EnumConverter<T>`,
all deriving from `RivetStringEnumConverter<T>`) apply to JSON bodies only. From
0.49.0 they read exactly the names the spec lists, case-sensitively, on every
runtime: integers, `"0"` (.NET 8 included), other casings and unknown dictionary
keys are a `JsonException`.

An enum in the route, query, header or form is parsed by ASP.NET, never by the
converter, yet the spec advertises the converter's names for it. Minimal APIs use
`Enum.TryParse` (exact member name, case-sensitive); MVC ignores case. So the
invariant is: every advertised wire value must equal its member name (exactly on
minimal APIs, ignoring case on MVC). Azure Functions is stricter: the worker reads
a route value as JSON, so no string wire value binds at all. `--check` enforces it
for contract handlers on all three hosts (`RIV4005`), including enums ASP.NET binds
member by member inside a complex parameter; generation enforces it for
`[RivetEndpoint]`/`[RivetClient]` actions (`RIV1110`, a static `[RivetEndpoint]`
gets the minimal-API rule). RIV codes:
https://maxanstey-meridian.github.io/rivet/reference/diagnostics. Parameters the
host reads as a JSON body are exempt.

For an enum bound outside the body, choose one:

1. a plain enum (integers on the wire);
2. the built-in `JsonStringEnumConverter<T>` with no `[JsonStringEnumMemberName]`
   renames (wire names are the member names); not on Functions;
3. bind a `string` and parse it in the handler.

camelCase/lowercase converters are fine on MVC and refused on minimal APIs;
snake, kebab and letter-changing renames are refused on both. Host leniency
(integers, other casings) is ASP.NET's, not a contract promise.

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

The worked sample is
https://github.com/maxanstey-meridian/rivet/tree/main/samples/FunctionsApi (guide:
https://github.com/maxanstey-meridian/rivet/blob/main/docs/guides/azure-functions.md);
the real-host gate is `task test:functions` in the rivet repo.
Use real HTTP tests for the host/worker routing and serialization boundary.

## Multiple File Representations

Declare allowed formats, then select the actual MIME type per response:

```csharp
// Contract initializer:
Define.File("/images/{id}")
    .ProducesFile("image/png")
    .ResponseBinaryContent(200, "image/jpeg");

// Handler (after Bind for an input-bearing definition):
return endpoint.File(bytes, contentType: actualMimeType).ToActionResult();
```

The selector works for bytes, streams, physical paths and writers. Omission is valid only
for an unambiguous binary success representation; undeclared selections fail.
Selection matches the complete declared media type case-insensitively. Rivet does
not negotiate Accept or inspect/convert the bytes. Define a file response with
`.File`/`.ProducesFile`; do not use native results just to choose a MIME type when
the supported selector is available.

The selector shipped in 0.42.0; check the project's pinned package/tool version
before using it.

## Streamed Files

For a body that only exists while it's sent (a live transcode), use the writer
terminal (0.48.0) rather than a native `Results.Stream`/`PushStreamContent`:

```csharp
return endpoint
    .File(output => transcoder.RunAsync(id, output, HttpContext.RequestAborted),
          contentType: "video/mp4")
    .ToActionResult();
```

Every `File(...)` rule (declared binary success, covered content type, concrete
type for a media range, valid entity tag) is checked before the writer runs. The
writer runs after the handler returns, so open what it needs inside it, and write
asynchronously (Kestrel refuses synchronous writes). There are no ranges; seeking
is an API concern (a start offset in the query). Once bytes are sent, an exception
can only cut the response short. On MVC, every Rivet file (bytes, streams, paths,
writers) is served by the same ASP.NET file results as minimal APIs.

## CLI

Install: https://github.com/maxanstey-meridian/rivet#install. Full flag reference:
https://maxanstey-meridian.github.io/rivet/reference/cli.

```bash
# Generate
dotnet rivet --project path/to/Api.csproj --output ./generated

# With metadata
dotnet rivet --project path/to/Api.csproj --output ./generated \
  --title "Orders API" --version 2.3.0 --server https://api.example.com --security bearer

# Contract coverage check (CI gate)
dotnet rivet --project path/to/Api.csproj --check

# Drift gate — fails if committed openapi.json is stale
dotnet rivet --project path/to/Api.csproj --output ./generated --verify

# List discovered endpoints
dotnet rivet --project path/to/Api.csproj --routes
```

`--security` accepts: `bearer`, `bearer:jwt`, `cookie:<name>`, `apikey:<in>:<name>`.

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
- Run both coverage (`--check` without `--output`) and spec drift (`--verify`) gates.
- Run real-host tests where transport integration is part of the change.
- Keep application architecture and generated-client policy separate from Rivet.

Coverage recognizes controller, minimal API and Functions handlers that return a
Rivet terminal through the first-party adapter, in the shapes listed under
"Handler shapes `--check` follows". It checks methods/routes, enum parameter
bindability (`RIV4005`), missing implementations, orphaned bindings, and the inputs
each minimal API or MVC handler binds against the contract's, by name and source,
reading binding the way ASP.NET does (`RIV4006`; Functions handlers aren't
compared). A handler that takes `HttpRequest`/`HttpContext` or reads `Request` is
trusted to read the rest by hand. The `Authorization` header, a `.QueryAuth()`
token and an apiKey scheme's parameter belong to security, so pass `--check` the
same `--security` flags as generation. It is not exhaustive control-flow
verification. A passing drift gate alone says nothing about implementation coverage
or host behavior.

## Anti-patterns

- duplicating route literals in handlers instead of using contract constants
- treating OpenAPI security declarations as authentication enforcement
- replacing first-party response adapters with hand-written bridges
- bypassing terminals while claiming Rivet validated the response
- wrapping the generated client in another identical service layer
- mixing domain/application concerns into the contract class
- using `.FormEncoded()` for multipart input
- calling new source-only APIs against an older pinned package
- a handler whose only terminals live in helpers (`MissingImplementation`)
- a Rivet case converter (or a renaming `[JsonStringEnumMemberName]`) on an enum bound from route/query/header/form
- native `Results.Stream`/`PushStreamContent` for a contract file instead of the writer terminal
- registering converters, a naming policy or other wire-changing settings in host JSON options (the adapters throw)
- `[JsonConverter]` on a property, or one Rivet can't model on a type (`RIV1111`); pin a primitive's wire with `[RivetSchemaType]` instead
- `[JsonDerivedType]` with an int tag or none (`RIV1014`); polymorphic tags are strings
- declaring `Authorization`, `Accept` or `Content-Type` as a header input (`RIV2009`)
