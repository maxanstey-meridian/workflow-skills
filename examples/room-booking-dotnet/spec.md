# Room Booking — Build Spec

A small co-working room-booking app: .NET 10 Web API + Nuxt 4 SPA, one fresh repo.
Everything here is decided; builders build it, they do not redesign it.

Actors: **Staff** add rooms. **Members** book a room for a time slot, cancel, or check in.
A booking not checked in within 15 minutes of its start is released. Members get a reminder
email the evening before a booking. Two bookings must never hold the same room at overlapping
times. Postgres 17 runs at `localhost:55471` (user/password `postgres`).

## Repo layout

```
global.json                     # 10.0.402, rollForward latestFeature
Directory.Build.props           # Nullable, ImplicitUsings, EnforceCodeStyleInBuild, AnalysisLevel latest
.editorconfig                   # plumb configs/editorconfig.dotnet verbatim
.config/dotnet-tools.json       # csharpier, dotnet-rivet, dotnet-ef
.gitignore                      # dotnet + node standard
pnpm-workspace.yaml             # packages: [ui, packages/contracts]
Taskfile.yml                    # gate tasks (written last by the orchestrator)
api/
  RoomBooking.slnx
  src/RoomBooking.Api/
    Program.cs                  # composition root only
    Common/ErrorResponse.cs
    Contracts/{Users,Rooms,Bookings}/   # transport: <Feature>Contract.cs + <Feature>Models.cs
    Modules/{Users,Rooms,Bookings}/     # per spec below
    Host/
      Persistence/RoomBookingDbContext.cs   (+ Migrations/)
      DevAuthentication/DevAuthHandler.cs
      DevSeeder.cs
      Composition.cs            # cross-module port bridges
  tests/RoomBooking.Api.Tests/
packages/contracts/             # generated openapi.json + schema.d.ts + hand-owned src/index.ts
ui/                             # Nuxt 4 SPA
README.md
```

## Backend stack (pinned)

- .NET 10 (SDK 10.0.402), ASP.NET Core minimal APIs, `sealed` on all concrete types, records for DTOs/commands/results.
- EF Core 10 + `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.x. One host-level `RoomBookingDbContext`; each module owns its `IEntityTypeConfiguration<T>` in `Modules/<F>/Infrastructure/Persistence/`; the DbContext applies them **explicitly** (no assembly scanning). Host-level migrations.
- `FluentValidation` 12 (explicit registration, every validator `.WithErrorCode(...)`), `FluentResults` 4 for Application failures.
- `Rivet.Attributes` 0.49.0 for transport contracts; `dotnet-rivet` emits the OpenAPI spec; `openapi-typescript` + `openapi-fetch` on the frontend.
- Tests: xUnit v3, `Microsoft.AspNetCore.Mvc.Testing`, `Testcontainers.PostgreSql`, `Respawn`, `NetArchTest.Rules` (ArchUnitNET has no stable release), `Microsoft.Extensions.TimeProvider.Testing` (note the exact ID), `FluentAssertions` 7.x.
- `TimeProvider` is the only clock: **no `DateTime.UtcNow`/`DateTimeOffset.UtcNow`/`DateTime.Now`/`now()` anywhere** (production code). Time flows from the injected `TimeProvider` into every use case, query, sweep, and SQL parameter.
- No MediatR, no AutoMapper, no DI auto-scanning. Use cases named `<Name>UseCase` with `Task ExecuteAsync(command, CancellationToken)`. Commands/results are sibling records in the same file.

### Error envelope (Common/ErrorResponse.cs)

```csharp
public sealed record ErrorResponse(string Code, string Message, IReadOnlyDictionary<string, string[]>? Errors = null);
```

Application failures: FluentResults `Result<T>` whose failed errors are:

```csharp
// FluentResults 4's Error is a plain class and C# records can only inherit records,
// so DeclaredError is a sealed class, not a record:
public sealed class DeclaredError : Error { public string Code { get; } ... }
```

Declaring use cases: `BookRoomUseCase.ExecuteAsync(BookRoomCommand, CancellationToken) : Task<Result<BookRoomResult>>`.
Transport edge maps failed results → contract `.Error(status, new ErrorResponse(code, message))` **once per endpoint**. Status split:
**409 Conflict** = conflicts with current state (`ROOM_ALREADY_BOOKED`, `ALREADY_CANCELLED`, `ALREADY_RELEASED`, `ALREADY_CHECKED_IN`, `ALREADY_ENDED`, `CHECK_IN_NOT_OPEN`, `CHECK_IN_WINDOW_CLOSED`, `ROOM_NO_LONGER_HELD`); **422** = invalid input (`VALIDATION_FAILED`, `END_BEFORE_START`, `START_IN_PAST`, `UNKNOWN_ROOM`, `ROOM_NAME_TAKEN`); **403** = `FORBIDDEN` (ownership); 404 = unknown booking id. Undeclared exceptions → 5xx via global exception handling.

## Modules

### Users (thin identity module)

- Domain: `User` (Id Guid v7, Name, Email unique, Role `UserRole { Staff, Member }`), `Infrastructure/Persistence/UserConfiguration.cs`.
- Published contract `Modules/Users/Contracts/IUserDirectory.cs`:
  `Task<UserSnapshot?> FindByEmailAsync(string, CancellationToken)`, `FindByIdAsync(Guid, CancellationToken)`, `Task<IReadOnlyList<UserSnapshot>> ListAsync(UserRole? role, CancellationToken)`.
  `public sealed record UserSnapshot(Guid Id, string Name, string Email, UserRole Role);`
- Application: `GetSessionQuery` (actor id → `SessionSnapshot(UserSnapshot User, SessionCapabilities Capabilities)`),
  `ListUsersQuery(role?)` → snapshots. `SessionCapabilities`:
  `public sealed record SessionCapabilities(bool CanManageRooms, bool CanBookRooms);` with
  `public static SessionCapabilities For(UserRole role)` — the one pure place mapping role → capabilities.
- Registration in `UsersModule.cs`: `AddUsersModule(IServiceCollection)` registers `IUserDirectory` (EF impl) + queries.

### Rooms

- Domain: `Room` (Id, Name, Capacity, CreatedAt). Unique index on `Name` (exact match).
- Application: `AddRoomUseCase` (staff-only at transport; validator: name 1..100 trimmed non-empty, capacity int 1..500;
  duplicate name → catch unique violation 23505 → `ROOM_NAME_TAKEN` 422), `ListRoomsQuery` → `RoomRow(Guid Id, string Name, int Capacity)`.
- Published contract `Modules/Rooms/Contracts/IRoomCatalog.cs`:
  `Task<RoomSummary?> FindAsync(Guid roomId, CancellationToken)`; `public sealed record RoomSummary(Guid Id, string Name, int Capacity);`

### Bookings (the core module)

Domain:
- `BookingStatus { Booked = 1, CheckedIn = 2, Cancelled = 3, Released = 4 }` (ints — the constraint SQL depends on them).
- `Booking` sealed entity: Id, RoomId, MemberId, Start, End, Status, CheckInAt?, ReminderSentAt?, HeldUntil, CreatedAt.
  Static factory `Booking.Reserve(roomId, memberId, start, end, createdAt)` sets `HeldUntil = Min(end, start + 15min)`.
  Transitions (the only mutation paths, guard-free — the decider guards first):
  `CheckIn(at)` → Status=CheckedIn, CheckInAt=at, HeldUntil=End; `Cancel()` → Status=Cancelled;
  `MarkReminderSent(at)` → ReminderSentAt=at.
- **Decider** `BookingLifecycle` (pure, no I/O):
  `enum BookingAction { Cancel, CheckIn }`, `enum BookingRefusal { NotActive, AlreadyCheckedIn, CheckInNotOpen, CheckInWindowClosed, AlreadyEnded }`,
  `readonly record struct BookingSnapshot(BookingStatus Status, DateTimeOffset Start, DateTimeOffset End)`.
  `public static BookingRefusal? Refusal(BookingSnapshot, BookingAction, DateTimeOffset now)` and
  `public static IReadOnlyList<BookingAction> Available(BookingSnapshot, DateTimeOffset now)`.
  Rules: any action refuses `NotActive` unless Status ∈ {Booked, CheckedIn}. CheckIn additionally refuses `AlreadyCheckedIn`
  (Status == CheckedIn), `CheckInNotOpen` (now < Start), `CheckInWindowClosed` (now ≥ Start + 15 min). Cancel refuses
  `AlreadyEnded` (now ≥ End). Constant: `BookingRules.CheckInGrace = TimeSpan.FromMinutes(15)` — the one definition.
- **One refusal→failure mapping** in Application (`BookingRefusals.ToDeclaredError(BookingRefusal)`), used by every use case.

Application ports (`Application/Ports/`):
- `IBookingRepository`: `Task<Booking?> FindAsync(Guid, CancellationToken)`; `Task AddAsync(Booking, CancellationToken)`
  (throws nothing expected — the use case catches the adapter's `BookingConflictException`); `Task<int> SaveAsync(CancellationToken)`;
  `Task<int> ReleaseDueAsync(DateTimeOffset now, CancellationToken)` (one atomic `UPDATE ... SET status=4 WHERE status=1 AND held_until <= @now`).
  EF `Status` is a **concurrency token** so concurrent transitions lose cleanly: on `SaveAsync`, translate
  `DbUpdateConcurrencyException` → `BookingStaleException` and `DbUpdateException` wrapping Postgres `23P01` → `BookingConflictException`
  (both custom exceptions in Infrastructure implementing the port; the use case maps them to declared failures).
- `IRoomDirectory` (consumer-owned required port): `Task<RoomSummary?> FindAsync(Guid, CancellationToken)`.
- `IMemberContacts`: `Task<MemberContact?> FindAsync(Guid memberId, CancellationToken)`; `MemberContact(Guid Id, string Name, string Email)`.
- `IEmailSender`: `Task SendAsync(EmailMessage, CancellationToken)`; `EmailMessage(string To, string Subject, string Body)`.
  Dev adapter `LoggingEmailSender` (module Infrastructure) logs subject + recipient + body at Information.

Use cases:
- `BookRoomUseCase`: validate (FluentValidation: roomId non-empty Guid, start/end instants, end > start), clock: `start.ToUniversalTime() < now` → `START_IN_PAST` 422;
  `IRoomDirectory.FindAsync` → null → `UNKNOWN_ROOM` 422; `Booking.Reserve(...)`; `AddAsync` + catch `BookingConflictException` → `ROOM_ALREADY_BOOKED` 409.
- `CancelBookingUseCase` / `CheckInBookingUseCase`: load (`null` → 404 `BOOKING_NOT_FOUND`), ownership (`booking.MemberId != actor` → 403 `FORBIDDEN`),
  decider guard (`Refusal` → the one mapping → 409), entity transition, `SaveAsync` → `BookingStaleException` → the refusal the decider gave
  (NotActive/AlreadyCheckedIn family), `BookingConflictException` → `ROOM_NO_LONGER_HELD` 409 (check-in only: someone rebooked the freed tail).
- `ReleaseStaleBookingsUseCase`: `repo.ReleaseDueAsync(clock.GetUtcNow())` → count.
- `SendDueBookingRemindersUseCase`: due = Status ∈ {Booked, CheckedIn} ∧ ReminderSentAt == null ∧ reminder-instant ≤ now, where
  reminder-instant = (local date of Start in configured zone − 1 day) at 18:30 in that zone. For each: resolve member contact
  (`IMemberContacts`, skip + log warning if gone), resolve room name (`IRoomDirectory`), send (`IEmailSender`), `MarkReminderSent(now)` + save.
  At-least-once: a crash between send and mark can re-send later (**Accepts** in INVARIANTS.md).
- Reads (named queries, no repository mutation):
  - `MyBookingsQuery(memberId) : Task<IReadOnlyList<BookingRow>>` — `BookingRow(Guid Id, Guid RoomId, string RoomName, DateTimeOffset Start, DateTimeOffset End, BookingStatus Status, DateTimeOffset? CheckInAt, DateTimeOffset? CheckInClosesAt, IReadOnlyList<BookingAction> AvailableActions)` sorted Start desc; `AvailableActions` from the decider with the injected clock; `CheckInClosesAt = Start + grace` when Status == Booked else null; RoomName via `IRoomDirectory`.
  - `RoomAvailabilityQuery(roomId, DateOnly date) : Task<AvailabilityResult>` — day bounds = [date 00:00, next 00:00) in configured zone;
    busy = `List<IntervalDto(DateTimeOffset Start, DateTimeOffset End)>` of `[Start, HeldUntil)` for Status ∈ {Booked, CheckedIn} overlapping the day, sorted by Start.

Infrastructure:
- `BookingConfiguration`: timestamptz columns (instants always UTC — `DateTimeOffset` offset 0; Npgsql requirement), int status, concurrency token on Status,
  indices: `(member_id)`, `(starts_at)`. Raw SQL in migration: `CREATE EXTENSION IF NOT EXISTS btree_gist;`
  `ALTER TABLE bookings ADD CONSTRAINT bookings_room_no_overlap EXCLUDE USING gist (room_id WITH =, (tstzrange(starts_at, held_until, '[)')) WITH &&) WHERE (status IN (1,2));`
  plus FKs `room_id → rooms(id)`, `member_id → users(id)` (raw SQL, no EF navigation). **Verified working on PG 17.11.**
- `Scheduling/BookingSchedulingOptions` bound from config `Scheduling`: `TimeZoneId` (default `Europe/London`), `ReminderAtHour` (18), `ReminderAtMinute` (30), `Enabled` (true).
- `Scheduling/ReleaseSweeper : BackgroundService` — `PeriodicTimer` on TimeProvider, every 30 s (comment: deadline sweep must run well inside the 15-min window), calls `ReleaseStaleBookingsUseCase`.
- `Scheduling/ReminderSweeper : BackgroundService` — on start runs once (catch-up for a missed evening), then sleeps to the next 18:30 zone instant and repeats. Loop body public as `RunOnceAsync(CancellationToken)` for tests. Sweeps register in `BookingsModule.cs`; config `Scheduling:Enabled=false` turns both off (tests use this and call use cases / `RunOnceAsync` directly).

Transport (`Contracts/Bookings/`, module-root `BookingsEndpoints.cs` + explicit `MapBookingsEndpoints`):
- `POST /api/bookings` `{ roomId, start, end }` → 201 `BookingDto`; `.Returns<ErrorResponse>(409)`, `(422)`, `.Returns(403)`. Policy **Member**.
- `GET /api/bookings/mine` → 200 `MyBookingsResponse { bookings: BookingDto[] }`. Policy **Member**.
- `POST /api/bookings/{id:guid}/cancel` and `/check-in` → 200 `BookingDto`; errors 403/404/409. Policy **Member**.
- `GET /api/rooms/{roomId:guid}/availability?date=YYYY-MM-DD` → 200 `AvailabilityResponse { roomId, date, busy: [{ start, end }] }`. Policy **Authenticated**. Route lives in `BookingsContract` (bookings read model).
- `BookingDto { id, roomId, roomName, start, end, status, checkInAt?, checkInClosesAt?, availableActions: BookingAction[] }`.
  Enums over the wire via `RivetCamelCaseEnumConverter<T>`: status `booked|checkedIn|cancelled|released`, actions `cancel|checkIn`, role `staff|member`.
- `availableActions` and `checkInClosesAt` come from the server — the UI must never re-derive them.

### Auth (host edge, no module)

- Users are seeded records (no registration flow, no passwords). `DevAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>` scheme **`DevUser`**: reads request header `X-User-Email`, resolves `IUserDirectory.FindByEmail`, builds claims: NameIdentifier = Id, email, Role. Unknown/missing email → no principal (endpoints then 401).
- Policies: `Authenticated`, `Staff`, `Member`. Every business endpoint has `.RequireAuthorization(...)` unconditionally (no `if env` around it); the dev handler is the only scheme (README notes where real auth would slot in).
- Claims → commands at the endpoint edge: `Guid memberId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)`.

### Rivet / contracts package

- Security declared in source: `[assembly: RivetSecurityScheme("devUser", "apiKey", parameterName: "X-User-Email", location: "header")]`
  `[assembly: RivetGlobalSecurity(0)]` `[assembly: RivetGlobalSecurityScheme(0, "devUser", new string[0])]`; only `GET /api/health` is `.Anonymous()`.
- Generation: `dotnet rivet --project api/src/RoomBooking.Api/RoomBooking.Api.csproj --output packages/contracts/generated --title "Room Booking API" --version 1.0.0 --security devUser=apikey:header:X-User-Email`
- Gate: `dotnet rivet ... --check` (coverage) and `--verify` (spec drift) both exit 0.
- `packages/contracts`: package.json `@roombooking/contracts` (exports `.`), `generated/openapi.json` (committed), `generated/schema.d.ts` (openapi-typescript, committed),
  hand-owned `src/index.ts` facade exactly per meridian rivet.md (createClient/configureRivet/client + re-export of `paths`/`components`).

### Host wiring (Composition.cs)

- `AddDbContext<RoomBookingDbContext>` (Npgsql) — connection string config key `ConnectionStrings:Database`, dev default
  `Host=localhost;Port=55471;Database=room_booking;Username=postgres;Password=postgres`; **env override `ConnectionStrings__Database`** (tests rely on it).
- Module registration: `AddUsersModule`, `AddRoomsModule`, `AddBookingsModule`.
- Cross-module bridges (host edge, consumer-owned ports): `IRoomDirectory` → adapter over `IRoomCatalog`; `IMemberContacts` → adapter over `IUserDirectory`.
- `TimeProvider` → `TimeProvider.System` (singleton). CORS in Development only: allow `http://localhost:3000`.
- Startup: `Database.MigrateAsync()`; in Development, `DevSeeder`: users (Amara Okafor, staff, `amara@roombooking.dev`; Ben Cohen, member, `ben@roombooking.dev`; Dana Whitfield, member, `dana@roombooking.dev`) and rooms (Willow Room 8, Alder Room 4, Oak Booth 2) inserted only when the table is empty.
- `MapUsersEndpoints`, `MapRoomsEndpoints`, `MapBookingsEndpoints`; literal `/health` bootstrap handler.
- API listens on `http://localhost:5000` (launchSettings + appsettings).

## Architecture rules (NetArchTest, in tests)

1. `Modules.*.Domain` depends on nothing outside itself (no Application/Infrastructure/Contracts, no DI, no AspNetCore, no EFCore, no Http).
2. `Modules.*.Application` does not depend on `Modules.*.Infrastructure` nor AspNetCore.
3. Modules never touch sibling module internals: `Modules.Rooms.*` may reference `Modules.Users.Contracts.*` (published snapshots) but never `Modules.Users.Domain|Application|Infrastructure`; same for Bookings (its required ports + the host bridges keep this true). A module's own `Contracts/` snapshot types may reference that same module's Domain enums (A's one deliberate seam — e.g. `UserSnapshot` carries `UserRole`); sibling modules only ever see the snapshots.
4. `Contracts.*` (transport) never references `Modules.*`; `Modules.*` never references `Contracts.*` or `Common.ErrorResponse`.
5. Every `*UseCase` is sealed with a public `ExecuteAsync` carrying a `CancellationToken`.
6. No `System.DateTime.UtcNow`/`DateTimeOffset.UtcNow` member access anywhere under `Modules.*` or `Host.*` (TimeProvider only).

## Backend tests (RoomBooking.Api.Tests)

- **Fixture** (collection fixture): Testcontainers `postgres:17` (image already on this machine); one database; migrations applied once; Respawn reset per test + users re-seeded via DevSeeder; `TestAppFactory : WebApplicationFactory<Program>` with env override `ConnectionStrings__Database`, `Scheduling:Enabled=false`, replaced `FakeTimeProvider`, environment Development. Helper clients per acting user: `client.Staff()`, `client.Member("ben@roombooking.dev")` set `X-User-Email`.
- Pure: `BookingLifecycleTests` — table-driven over statuses × now (before start, inside window, at/after close, after end) and both actions; `Available` consistent with `Refusal`.
- API integration (`Testcontainers` + real Postgres):
  - Rooms: staff creates 201; member → 403; duplicate name → 422 `ROOM_NAME_TAKEN`; invalid capacity → 422; list.
  - Book: member 201; staff → 403; end ≤ start → 422; past start → 422; unknown room → 422; **sequential overlap** → 409 `ROOM_ALREADY_BOOKED`.
  - **Concurrency proof**: two overlapping POSTs from two clients fired behind a `TaskCompletionSource` barrier — exactly one 201, one 409; exactly one active booking row for the room (direct SQL count). No sleeps.
  - Cancel: happy; second cancel → 409; other member's booking → 403; unknown id → 404; after end → 409.
  - Check-in: before start → 409 `CHECK_IN_NOT_OPEN`; inside window → 200 status `checkedIn`; after close (clock advanced) → 409 `CHECK_IN_WINDOW_CLOSED`; double check-in → 409; **freed-tail conflict**: A books 10:00–11:00, B books 10:16–10:50, clock 10:14 → A check-in → 409 `ROOM_NO_LONGER_HELD` (the 23P01 path through the real DB).
  - Release: booking 10:00–11:00, clock 10:14:59 → `ReleaseStaleBookingsUseCase` releases nothing; clock 10:16 → releases it; slot rebookable afterwards; checked-in booking never released.
  - Reminders: booking tomorrow 14:00; `RunOnceAsync` at today 18:29 → no email; at 18:31 → exactly one email to the member's address with room name; run again → no duplicate; cancelled booking → none.
  - Availability: booked slot busy; cancelled booking absent; released booking absent; day boundary from the configured zone.
  - Direct DB boundary test: two overlapping inserts via `RoomBookingDbContext` → second `SaveChanges` throws with Postgres SqlState `23P01`.
  - Auth: no header → 401; unknown email → 401; member on staff endpoint → 403.
- Architecture tests per the rules above.
- DB name in tests: `room_booking_test` (Testcontainer-managed).

## Frontend (Nuxt 4 SPA, `ssr: false`)

- pnpm workspace with `packages/contracts`. Deps: `@nuxt/ui`, `@vueuse/core`; dev: `vitest`, `@vue/test-utils`, `happy-dom`, `vue-tsc`, `oxlint` + `oxfmt` (`.oxlintrc.json`/`.oxfmtrc.json` carrying the plumb base settings), `@nuxt/eslint` as the Vue layer (eslint.config.mjs per meridian tools.md; ignores for `.nuxt`, `.output`, `packages/contracts/generated`).
- `configureRivet` once (Nuxt plugin or app bootstrap) with `baseUrl http://localhost:5000` and a fetch wrapper adding `X-User-Email` from the acting-as selection (persisted in localStorage).
- Composition roots only in `app.vue`, layouts, pages. Canonical `useProvideInject` helper (VueUse `provideLocal`/`injectLocal`, inject-throws-on-missing) in `app/shared/composables/`.
- Cross-page features: `app/features/session/` (port `Session` + provide/inject + `useRivetSession` composable — loads `/api/session`, exposes user + capabilities + acting-as switching), `app/features/rooms/` (port + composable for the rooms list; used by book page and staff page).
- Pages (page-local ports/logic/composables/components beside each page):
  - `/` **Book a room**: date picker (defaults to today) → rooms with availability (busy blocks shown, free slots visible) → time pickers → confirm. Success → confirmation + link to My bookings. Server refusal (409/422) → banner with the server message. Booking button offered only when `capabilities.canBookRooms`.
  - `/my-bookings`: list with status, room, times; **Check in** button when `availableActions` contains `checkIn`, copy states the consequence ("Check in by 14:15 or the room is released" from `checkInClosesAt`); **Cancel** with confirm; server refusals shown as banners. Offered only when `capabilities.canBookRooms`.
  - `/rooms`: staff add-room form (name, capacity) + list. Members see a short explanation instead of the form (from capabilities, not a role string).
- Labels speak outcomes, not API: "Add a room", "Book this room", "Check in", "Cancel booking", error banners quote the server's `message`. GOV.UK-style clarity for copy the spec leaves open.
- Tests (vitest, `ui/tests/` mirroring `app/`): pure `logic/` (availability rendering, interval formatting, `checkInClosesAt` copy), session/booking composable behaviour with a typed fake client (typed against `components["schemas"]["…"]`), one page-level integration test where wiring matters. No mock soup.

## Sequencing

1. **Builder A — scaffold + Users + Rooms + auth + persistence + contracts pipeline + tests.**
2. **Builder B — Bookings module + sweeps + bridges + concurrency/release/reminder tests + architecture tests + `INVARIANTS.md` + contracts package generation.**
3. **Builder C — the Nuxt UI + tests.**
4. Orchestrator: full gate, README, Taskfile.

## Gate (definition of done)

`dotnet build` clean; `dotnet test` green (unit + integration on real Postgres); `dotnet rivet --check` and `--verify` exit 0; `dotnet csharpier check .` clean; `pnpm typecheck`, `pnpm test`, lint green in `ui/`. API boots against `localhost:55471` and `/health` responds.
