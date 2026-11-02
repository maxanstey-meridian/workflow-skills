# Room Booking

A small room-booking app for a co-working space: a .NET 10 Web API and a Nuxt 4
single-page frontend.

- **Staff** add rooms.
- **Members** book a room for a time slot, cancel a booking, or check in.
- A booking **not checked in within 15 minutes of its start is released** (the room
  becomes bookable again).
- Members get a **reminder email the evening before** a booking (18:30, Europe/London by
  default; emails are written to the API log in this build).
- **Two bookings never hold the same room at overlapping times** — enforced by a
  PostgreSQL exclusion constraint, not by application checks.

## Prerequisites

| Tool | Version | Used for |
| --- | --- | --- |
| .NET SDK | 10 (`global.json` pins 10.0.402) | API |
| Node + pnpm | Node 26, pnpm 12 | frontend, contracts package |
| Docker | any recent | backend integration tests (they start a throwaway PostgreSQL 17 container) |
| PostgreSQL 17 | running at `localhost:55471` (user/password `postgres`) | the app's runtime database |
| [go-task](https://taskfile.dev) | 3.x | the `task` commands below (optional — every command is plain `dotnet`/`pnpm`) |

The tests do **not** use the provided Postgres; they start their own container. The app
itself runs against `localhost:55471` by default — point it elsewhere with
`ConnectionStrings__Database` (a connection string) or edit
`api/src/RoomBooking.Api/appsettings.Development.json`.

## Run it

```bash
task dev          # API on http://localhost:5000, UI on http://localhost:3000
```

or, without go-task:

```bash
dotnet run --project api/src/RoomBooking.Api   # API, migrates the database on boot
cd ui && pnpm install && pnpm dev              # UI
```

On first boot the API creates and migrates the `room_booking` database and seeds demo
data (Development only, only when the tables are empty).

### Who you are (development auth)

This build has no login screen. Authentication is a dev handler at the transport edge:
send an `X-User-Email` header and the API resolves that user, its role, and its
capabilities from the seeded users. The UI ships an "acting as" picker (top bar) that
sets the header for you; it defaults to `ben@roombooking.dev` so a fresh browser works.
A real deployment replaces the scheme (`Host/DevAuthentication/DevAuthHandler.cs`) with
real authentication — authorization policies (`Staff`, `Member`) and every use-case
check stay as they are.

Seeded users:

| Email | Role |
| --- | --- |
| `amara@roombooking.dev` | staff |
| `ben@roombooking.dev` | member |
| `dana@roombooking.dev` | member |

Seeded rooms: Willow Room (8 seats), Alder Room (4), Oak Booth (2).

### Try the whole flow

1. As a member (`ben`), open http://localhost:3000 — pick a date, see each room's taken
   blocks, choose a time range, book. The confirmation shows the check-in deadline.
2. **My bookings** shows the booking with the actions the server allows right now:
   **Check in** (only from the slot's start until 15 minutes in — the page shows the
   deadline) and **Cancel booking**.
3. As staff (`amara`), the **Rooms** page has the add-room form; members see the room
   list and a short explanation instead.
4. Book an overlapping slot with another member — the server refuses it with
   `ROOM_ALREADY_BOOKED` (409). The same happens under concurrent requests; a
   PostgreSQL exclusion constraint arbitrates the race (see `BookingConcurrencyTests`).

## API

Base URL `http://localhost:5000`. All business endpoints require the `X-User-Email`
header. Declared errors use one envelope:

```json
{ "code": "ROOM_ALREADY_BOOKED", "message": "That room is already booked at overlapping times.", "errors": null }
```

| Method | Route | Who | Notes |
| --- | --- | --- | --- |
| GET | `/health` | anyone | bootstrap health |
| GET | `/api/session` | signed in | current user + capabilities (`canManageRooms`, `canBookRooms`) |
| GET | `/api/users` | signed in | seeded users (the acting-as picker) |
| GET | `/api/rooms` | signed in | room list |
| POST | `/api/rooms` | staff | create `{ name, capacity }`; 422 `VALIDATION_FAILED`, `ROOM_NAME_TAKEN` |
| GET | `/api/rooms/{roomId}/availability?date=YYYY-MM-DD` | signed in | busy intervals for that day (day bounds in the booking zone) |
| POST | `/api/bookings` | member | `{ roomId, start, end }`; 201 with the booking; 409 `ROOM_ALREADY_BOOKED`; 422 `END_BEFORE_START`, `START_IN_PAST`, `UNKNOWN_ROOM` |
| GET | `/api/bookings/mine` | member | own bookings with server-computed `availableActions` and `checkInClosesAt` |
| POST | `/api/bookings/{id}/cancel` | member (own) | 409 `ALREADY_CANCELLED`, `ALREADY_RELEASED`, `ALREADY_ENDED`; 403 `FORBIDDEN`; 404 |
| POST | `/api/bookings/{id}/check-in` | member (own) | 409 `CHECK_IN_NOT_OPEN`, `CHECK_IN_WINDOW_CLOSED`, `ALREADY_CHECKED_IN`, `ROOM_NO_LONGER_HELD`; 403; 404 |

Statuses are `booked`, `checkedIn`, `cancelled`, `released`. The client never derives
which actions are possible — it reads `availableActions` (the same pure decider the use
cases guard with) and `checkInClosesAt`.

The OpenAPI 3.1 spec (`packages/contracts/generated/openapi.json`) and the typed
frontend client (`packages/contracts/generated/schema.d.ts`) are generated from the C#
transport contracts with [Rivet](https://github.com/maxanstey-meridian/rivet). After a
contract change: `task contracts:generate`, then commit. `task contracts:check`
(coverage) and `task contracts:verify` (drift) gate it.

## The booking rules

- **Occupancy window.** A booking holds its room for `[start, heldUntil)`. Until check-in,
  `heldUntil = min(end, start + 15 minutes)`; once checked in, `heldUntil = end`.
  Cancelling (or the no-show release) frees the room immediately.
- **Check-in window.** Check-in opens at the slot's start and closes 15 minutes later —
  the same moment an unchecked booking is released. Checking in when someone else has
  already taken a freed tail of your slot is refused with `ROOM_NO_LONGER_HELD`.
- **No-show release.** A sweep (every 30 s, `ReleaseSweeper`) transitions bookings whose
  hold window has lapsed from `booked` to `released`.
- **Reminders.** A sweep (`ReminderSweeper`) sends, per booking, one email whose due
  instant is 18:30 in the booking zone on the day before the slot's local start date. It
  runs at startup too (catch-up for a missed evening) and marks bookings sent
  (at-least-once: a crash between send and mark can re-send). Emails are written to the
  API log in this build; swap the `IEmailSender` adapter for SMTP when you have a server.
- **Overlap.** `bookings` carries an exclusion constraint:
  `EXCLUDE USING gist (room_id WITH =, (tstzrange(starts_at, held_until, '[)')) WITH &&) WHERE (status IN (1, 2))`
  — so no two active bookings (`booked`, `checkedIn`) can overlap on one room, whatever
  the interleaving. The application maps the constraint's violation to the declared
  `ROOM_ALREADY_BOOKED` failure; it never pre-checks and inserts.
- **Zone.** Scheduling (evening reminder, availability day bounds) uses
  `Scheduling:TimeZoneId` (default `Europe/London`); see
  `api/src/RoomBooking.Api/Modules/Bookings/INVARIANTS.md` for the rules the module owns
  and how each one is proved.

## Tests

```bash
dotnet test api/RoomBooking.slnx      # backend: unit + integration (Testcontainers PostgreSQL 17)
cd ui && pnpm test                    # frontend: vitest
```

The backend suite covers the booking lifecycle decision table, every endpoint's success
and declared-failure outcomes, the two-booking race (deterministic barrier, one winner,
one `409`), the constraint directly (two overlapping inserts → PostgreSQL `23P01`), the
release and reminder sweeps against a fake clock, the availability read model including
zone day boundaries, auth/authorization, and architecture rules (module boundaries, layer
direction, no ambient clock) via NetArchTest. All 70 backend tests run against a real
PostgreSQL 17 in a Testcontainer; the frontend tests run against typed fakes of the
generated contract client.

`task gate` runs everything (build, backend tests, formatting, both contract gates,
frontend typecheck, tests, lint, build).

## Layout

```
api/src/RoomBooking.Api/
  Common/            ErrorResponse — the one declared-error envelope
  Contracts/         Rivet transport contracts per feature (routes + wire records)
  Modules/
    Users/           identity: users, roles, session capabilities (published: IUserDirectory)
    Rooms/           room catalog (published: IRoomCatalog)
    Bookings/        the core: lifecycle decider, use cases, sweeps, reads (INVARIANTS.md)
  Host/              composition: DbContext + migrations, dev auth, seeder, port bridges
packages/contracts/  generated OpenAPI + TS types + the hand-owned client facade
ui/                  Nuxt 4 SPA (app.vue / layouts / pages are the only composition roots)
```

Each module owns its domain, application (use cases, queries, ports), infrastructure (EF
mapping, adapters) and transport edge; modules collaborate only through the published
contracts and required ports you see bridged in `Host/Composition.cs`.
