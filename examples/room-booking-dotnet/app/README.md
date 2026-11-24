# Room booking — a co-working space

A small room-booking app: staff add rooms, members book a room for a time
slot, cancel, or check in. Two bookings can never hold the same room at
overlapping times. A booking not checked in within 15 minutes of its start
is released, and members get a reminder email the evening before a booking.

- **API**: .NET 10, ASP.NET Core minimal APIs with [Rivet](https://github.com/maxanstey-meridian/rivet)
  transport contracts, EF Core + Npgsql on PostgreSQL, xUnit tests.
- **Frontend**: Nuxt 4 single-page app (`ssr: false`), `@nuxt/ui`, TypeScript,
  vitest; the typed client is generated from the API's OpenAPI spec into
  `packages/contracts`.
- **Tasks**: [go-task](https://taskfile.dev) — `task --list-all` shows everything.

## Prerequisites

- .NET SDK 10 (pinned in `api/global.json`)
- Node 20+ and pnpm 10+
- PostgreSQL 17 running at `localhost:55471` (user `postgres`, password
  `postgres`); override with `ConnectionStrings__Cowork` for the app and
  `COWORK_TEST_DATABASE` for tests
- [Task](https://taskfile.dev) (optional but convenient)
- `dotnet tool restore` (installs `dotnet-rivet`, `dotnet-ef`, `csharpier`)

## Run it

```sh
task install        # dotnet tools + pnpm packages
task api:run        # API on http://localhost:5199 (migrates the dev database)
task web:dev        # frontend on http://localhost:3000
```

The API's first development run applies its migrations (including the
`btree_gist` extension and the bookings exclusion index) automatically.

## Sign in (development personas)

There is no password screen: the API identifies a persona from the
`X-Dev-User` header, which the frontend sends for the persona you pick in
the header. Directly against the API:

```sh
curl -H "X-Dev-User: staff:maya@cowork.test"  -H "Content-Type: application/json" \
     -d '{"name":"Huddle","capacity":4}' http://localhost:5199/api/rooms
curl -H "X-Dev-User: member:alex@cowork.test" http://localhost:5199/api/bookings/mine
```

- `staff:maya@cowork.test` — can add rooms
- `member:alex@cowork.test`, `member:sam@cowork.test` — can book, cancel, check in

Every other endpoint requires the header; anonymous calls get 401 and a
member calling a staff endpoint gets 403.

## Tests and checks

```sh
task api:test       # 64 tests: domain, use cases, repository behaviour on
                    # in-memory and real PostgreSQL, race proofs, API journeys
task web:test       # frontend unit + wiring tests
task web:typecheck  # vue-tsc
task web:lint       # oxlint + oxfmt + eslint (Vue layer)
task contracts:check  # Rivet coverage + generated-spec drift gates
task gate           # all of the above plus format checks
```

Integration tests run on the real PostgreSQL engine (a throwaway database is
created from `COWORK_TEST_DATABASE`, default `localhost:55471`, migrated,
reset between tests, and dropped afterwards).

## How the rules hold

**Two bookings never hold the same room at overlapping times.** The
invariant is "a room holds at most one active booking covering any instant".
It is enforced at the authoritative boundary, inside the write itself: a
partial exclusion index on `bookings` —

```sql
EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
WHERE (status IN ('Booked', 'CheckedIn'))
```

— so two concurrent inserts for overlapping slots cannot both commit; the
loser's `23P01` is read by the adapter as a domain outcome, not a 500. The
use case checks first only to give a better error; the index decides.
`BookingOverlapInterleavingTests` proves the race on real PostgreSQL with a
header comment walking the breaking interleaving and why every smaller
mechanism fails.

**A booking not checked in within 15 minutes is released.** `BookingLifecycle`
(the one pure decider for what a member may do and when) refuses check-in
outside `[start, start + 15 minutes]`; a hosted sweep releases booked
bookings past that moment with a conditional `UPDATE`, so re-running is
harmless. Cancelled and released bookings leave the exclusion index, so
their slots can be booked again.

**A reminder email the evening before.** A daily worker fires at 18:00 in the
space's time zone (configured, validated at startup), finds booked bookings
starting tomorrow with no reminder yet, sends via the `Mailer` port (the
development adapter logs the email), and marks it sent with a conditional
write — a rerun never sends a second reminder.

**The UI reads the server's answers.** `GET /api/bookings/mine` sends each
booking's `availableActions` computed by the same `BookingLifecycle` the use
cases guard with, and the rooms list sends the add-room form's limits — the
frontend never re-derives a server rule.

## Layout

```
api/                 .NET solution
  src/Api/           host + Modules/{Rooms,Bookings} + Contracts/ + Common/
  src/Api.Tests/     domain, use-case, behaviour (fake + real adapter),
                     interleaving, and API journey tests
packages/contracts/  generated OpenAPI spec + TypeScript types + client
web/                 Nuxt 4 single-page app
Taskfile.yml         build, run, test, lint, gate
```

Module dependencies run one way: Bookings consumes Rooms' published
`RoomDirectory` contract (a booking cannot keep its rules without rooms);
the claim and its reason live in `api/.plumb-modules.json`, and the Bookings
module's enforced invariants are recorded beside the code in
`api/src/Api/Modules/Bookings/invariants.yaml`.

---

## Run notes

- Model: GLM-5.3 Flash Flex (neuralwatt), one-shot prompt, no `/spec`,
  `/go`, or `/cycle`; output kept as built, unreviewed.
- Harness: OpenCode.
- Date: 2026-11-24.
- Tokens and cost: not recorded in this run.

<details>
<summary>Prompt verbatim</summary>

```text
Build a small room-booking app for a co-working space: a .NET 10 Web API and a Nuxt 4 single-page frontend, in this empty repo. Follow the meridian skill. Staff add rooms. Members book a room for a time slot, cancel, or check in. A booking not checked in within 15 minutes of its start is released, and members get a reminder email the evening before a booking. Two bookings must never hold the same room at overlapping times. Postgres 17 is running at localhost:55471 (user postgres, password postgres). Include tests and a README saying how to run it. Work until it builds and its tests pass, then stop. This is a non-interactive run: nothing resumes you when a background task finishes, so wait for every subagent you start before you stop.
```

</details>
