# Room Booking

A small room-booking app for a co-working space: a .NET 10 Web API and a Nuxt 4
single-page frontend, backed by PostgreSQL 17.

Staff add rooms. Members book a room for a time slot, cancel, or check in.
A booking that is not checked in within 15 minutes of its start is released,
and members get a reminder email the evening before their booking.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com) (pinned by `global.json`)
- Node.js 20+ and [pnpm](https://pnpm.io)
- PostgreSQL 17 on `localhost:55471` (user/password `postgres`) — the included
  `compose.yml` provides one:

  ```sh
  docker compose up -d db
  ```

The connection string defaults to this instance; override with the
`ConnectionStrings:Db` setting or the `ROOMBOOKING_DB` environment variable.

## Run it

```sh
# 1. The API (applies its schema and seeds demo users on first start)
cd api
dotnet tool restore
dotnet run --project src/RoomBooking.Api       # listens on http://localhost:5000

# 2. The frontend (in a second terminal)
cd frontend
pnpm install
pnpm dev                                       # http://localhost:3000
```

### Demo identities

The app ships with a development identity scheme: the bearer token is one of
the seeded user ids, and `GET /api/users` (public) lists them. The frontend has
an "Acting as" picker that signs you in as one of:

- **Ada (staff)**, Bo (staff) — add rooms
- **Mia (member)**, Kai (member) — book, cancel, check in

A real deployment replaces the dev handler and the user seeding with real
authentication; the `[Authorize]` wiring, the named policies, and the use-case
checks are unchanged.

### What the demo shows

1. As **Ada (staff)**: on *Rooms*, add a room.
2. As **Mia (member)**: on *Book a room*, pick a day, start time, and duration,
   search, and book a free room. Confirmation explains the check-in window and
   the reminder.
3. On *My bookings*: Cancel (frees the room for others) or Check in (only once
   the slot starts).
4. Every night at **18:00** in the host's time zone (override with
   `Scheduling:BusinessTimeZone`), the reminder sweep emails next day's
   bookings. Emails are written as JSON files to
   `api/src/RoomBooking.Api/email-out/` so you can see what went out; a
   production deployment swaps in its SMTP adapter for the same port
   (`IEmailSender`).
5. Bookings missed past the start plus 15 minutes are released by the
   one-minute release sweep and the slot becomes bookable again.

## Tests

```sh
# API: unit tests for the lifecycle decider, integration tests against the
# real PostgreSQL engine (the provided server; see ROOMBOOKING_TEST_DB),
# API-contract tests through WebApplicationFactory, and architecture tests.
cd api
dotnet test

# Frontend: vitest over the pure presentation logic
cd frontend
pnpm test
```

Integration tests drop and recreate a database named `room_booking_tests` on
the same server. A check that can't fail proves nothing; the concurrency test
runs eight identical bookings in parallel and requires exactly one winner —
arbitrated by the database, not by waiting.

## Keeping the contract true

The API's transport shape lives in `Contracts/` as Rivet contracts, and the
OpenAPI 3.1 spec generated from them is committed at `api/generated/openapi.json`.
The frontend's typed client (`frontend/app/api/generated/schema.d.ts`, via
openapi-typescript + openapi-fetch) is generated from that spec.

```sh
# Contract coverage: every declared route has an implementation that binds and
dotnet rivet --project api/src/RoomBooking.Api/RoomBooking.Api.csproj --check

# Drift: the committed spec matches the contracts, or the gate fails
dotnet rivet --project api/src/RoomBooking.Api/RoomBooking.Api.csproj \
    --output api/generated --title "Room Booking API" --version 1.0.0 \
    --server http://localhost:5000 --verify

# Regenerate the spec and the frontend client after changing contracts
dotnet rivet --project api/src/RoomBooking.Api/RoomBooking.Api.csproj \
    --output api/generated --title "Room Booking API" --version 1.0.0 \
    --server http://localhost:5000
cd frontend && pnpm gen:api
```

## How the rules are enforced

- **Two bookings must never hold the same room at overlapping times.** The
  authority is a PostgreSQL exclusion constraint (`bookings_no_room_overlap`,
  a gist index over `room_id` and `tstzrange(start_utc, end_utc)` restricted to
  bookings that still hold their room). Concurrent bookings race at commit; the
  loser is mapped, once, to a declared `booking_room_overlapped` failure.
  Cancelled and released bookings leave the index, so a freed slot can be
  rebooked, and adjacent half-open slots ([start, end)) do not conflict.
- **The booking lifecycle** is one pure decider (`BookingLifecycle`): it
  answers "may this action happen now, and if not why?" for check-in and
  cancel, guards the use cases, and every booking read model carries
  `availableActions` computed by the same function — the frontend never
  re-derives a server rule. State changes use atomic conditional writes
  (`UPDATE … WHERE status = 'Booked'`).
- **Release** is a sweep that releases every Booked booking whose window
  closed, one minute at a time — time-critical, user-visible work, so it does
  not wait for off-peak hours.
- **Reminders** run the evening before a booking (18:00 in the business zone by
  default), each booking's send spread by a stable hash of its id across a
  20-minute window so a batch never stampedes and a rerun keeps the same slot.
  `ReminderSentAtUtc` makes a rerun a no-op. Undelivered reminders still leave
  after the window opens, so a restart can never lose one silently.

## API surface

- `GET /api/users` — the demo identities (public)
- `GET /api/rooms` — all rooms (any signed-in user)
- `POST /api/rooms` — add a room (staff)
- `GET /api/rooms/availability?startUtc&endUtc` — rooms free for a slot
- `GET /api/bookings` — the member's bookings, with `availableActions`
- `POST /api/bookings` — book a room (member)
- `POST /api/bookings/{id}/cancel` — cancel before the start
- `POST /api/bookings/{id}/check-in` — check in between start and start+15 min

Every declared failure comes back as one error envelope:
`{ "code", "message", "errors"? }` with the status the failure deserves
(422 validation, 403 forbidden, 404 not found, 409 conflict).
