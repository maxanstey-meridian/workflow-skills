# Cowork room booking

A small room-booking app for a co-working space: a .NET 10 Web API and a Nuxt 4
single-page frontend. Staff add rooms. Members book a room for a time slot, cancel, or
check in. A booking not checked in within 15 minutes of its start is released, and members
get a reminder email the evening before a booking.

## How to run it

Prerequisites:

- .NET 10 SDK (pinned in `global.json`)
- Docker (the test suite starts its own PostgreSQL 17 container)
- PostgreSQL 17 running locally — the API expects `localhost:55471`, user `postgres`,
  password `postgres` (override in `src/Api/appsettings.json`)
- Node 22+ with [pnpm](https://pnpm.io) and [Task](https://taskfile.dev)

Restore tools and packages once:

```sh
dotnet tool restore
pnpm install
pnpm --filter @cowork/web exec nuxt prepare
```

Run the API (it migrates the `cowork` database itself on startup):

```sh
dotnet run --project src/Api            # listens on http://localhost:5213
```

Run the frontend in a second terminal:

```sh
task web:dev                            # http://localhost:3000, proxies /api to the API
```

### Who you are

The app has no real identity provider. A development authentication handler signs the
caller in as a dev persona named by the `X-Dev-User` header, which the frontend sets for
you — switch persona with the selector in the page header:

| Header value | Persona | Role |
| --- | --- | --- |
| `ada` | Ada | Staff — can add rooms |
| `ben` | Ben | Member |
| `cleo` | Cleo | Member |

Times are shown and booked as UTC. The space itself operates in Europe/London (change it
under `Space:TimeZoneId` in `appsettings.json`); reminder emails are sent at or after 18:00
in the space's time zone, on the evening before each booking.

## What the API serves

The transport contract is Rivet (`src/Api/Contracts/`); the OpenAPI document and the
frontend's typed client are generated from it into `packages/contracts`.

| Method | Route | Who |
| --- | --- | --- |
| GET | `/api/rooms` | any signed-in user |
| POST | `/api/rooms` | staff |
| GET | `/api/rooms/{roomId}/day?date=YYYY-MM-DD` | any signed-in user |
| GET | `/api/bookings` | the caller's own bookings |
| POST | `/api/bookings` | book a room for a time slot |
| POST | `/api/bookings/{id}/cancel` | the booking's owner |
| POST | `/api/bookings/{id}/check-in` | the booking's owner |

Declared failures use one envelope, `{"code", "message", "errors?"}`, e.g. `409
room_already_booked`, `409 booking_not_cancellable`, `409 booking_not_checkable`, `404
room_not_found`, `404 booking_not_found`, `422 booking_in_past`, `422 validation_failed`.

Booking reads carry `availableActions` — which actions are open right now, with a reason
when they are not — computed by the same domain decider the write paths use.

## How it enforces the rules

- **Two bookings never hold the same room at overlapping times.** The `bookings` table
  carries a PostgreSQL exclusion constraint
  (`EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE
  (status IN ('Booked','CheckedIn'))`). The write itself decides; a conflict comes back to
  the member as `409 room_already_booked`. See `Modules/Bookings/INVARIANTS.md`.
- **Release.** A booked hold not checked in within 15 minutes of its start is released by a
  background sweep that runs every minute; the room is bookable again immediately.
- **Reminder email.** A daily-rule dispatcher ticks every five minutes and sends a member a
  reminder once the evening (18:00 in the space's time zone) of the day before their
  booking arrives. The development email adapter writes each message to the log; swap
  `LoggedBookingReminders` for a real sender to deliver mail.
- **Check-in window.** Check-in opens 15 minutes before the start and closes at the
  release deadline; the booking page shows when it is closed and why.

## Development

Everything CI runs, in one command:

```sh
task check          # build + contract coverage/drift gates + API tests + frontend tests
```

Common tasks:

```sh
task api:test       # xUnit: unit, use-case, and PostgreSQL integration tests (Docker needed)
task web:test       # vitest for the Nuxt app
task web:typecheck  # vue-tsc
task contracts:generate   # regenerate openapi.json + schema.d.ts after a contract change
task api:format     # analyser fixes, then CSharpier
```

Layout:

```
src/Api/                 the .NET API
  Contracts/             Rivet transport contracts (routes + wire types)
  Modules/Rooms/         room directory (domain, application, infrastructure)
  Modules/Bookings/      bookings, including its INVARIANTS.md
  Infrastructure/        DbContext, dev auth, adapters, background jobs
  Migrations/            EF Core migrations
src/Api.Tests/           unit + use-case + PostgreSQL (Testcontainers) + real-host tests
packages/contracts/      generated OpenAPI + TypeScript schema, hand-owned client facade
apps/web/                Nuxt 4 SPA (features hold ports, composables, and pure logic)
```

The frontend is a single-page app (`ssr: false`) that talks to the API through the
generated client in `@cowork/contracts`; pages are the composition roots, components and
composables inject the capabilities they provide.

### Emails in development

Reminders are logged, not delivered. The log line looks like:

```
info: Email to ben@cowork.test: Reminder: Focus Room tomorrow at 09:00 ...
```
