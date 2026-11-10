# Bookings — invariants

The invariants this module owns, beside the code that enforces them.

## BKG-001 — Two bookings never hold the same room at overlapping times

**Rule:** A room is held by at most one booking at any instant. Only `Booked` and `CheckedIn`
bookings hold the room; `Cancelled` and `Released` do not.

**Why:** A room cannot serve two members at once; a double hold breaks every promise the
booking page makes.

**Accepts:** None. Adjacent holds are allowed: a booking ending at 10:00 and one starting at
10:00 do not conflict (the range is half-open).

**Owner:** PostgreSQL. The `bookings_no_double_hold` exclusion constraint
(`EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE
(status IN ('Booked','CheckedIn'))`, created in the initial migration) refuses the second
hold at write time; the repository translates the expected conflict into the declared
`RoomAlreadyHeld` outcome. A pre-check in the use case would not decide anything.

**Proof:** `BookingRepositoryTests` runs on PostgreSQL (Testcontainers): overlapping holds
are refused, adjacent holds and holds on freed rooms are accepted.

## BKG-002 — Every booking transition goes through the one decider

**Rule:** A booking moves between `Booked`, `CheckedIn`, `Cancelled`, and `Released` only
when `BookingDecider` allows it, and no code elsewhere answers the same question.

**Why:** The check-in window (15 minutes before the start) and the release grace (15
minutes after it) are one set of numbers; a second copy of the rule drifts and the read
model's `availableActions` stops matching what the API would actually accept.

**Accepts:** None.

**Owner:** `BookingDecider` (pure), called by the `Booking` entity's `Cancel`, `CheckIn`,
and `Release` methods and by the read model's `availableActions`.

**Proof:** `BookingDeciderTests` covers every state, action, and window boundary;
`BookingLifecycleUseCaseTests` proves the use cases refuse what the decider refuses.

## BKG-003 — The release sweep's query is the decider's rule in SQL

**Rule:** The sweep loads candidates with `status = 'Booked' AND starts_at < now - 15
minutes` — exactly the bookings `BookingDecider.IsReleasable` would release, no more, and
each loaded row still passes through the decider before it is released.

**Why:** The sweep's SQL is a copy of a domain rule, and a copy that drifts releases rooms
early or keeps stale holds.

**Accepts:** None.

**Owner:** `PostgresBookingRepository.ListExpiredAsync`, pinned by
`BookingRepositoryTests.ListExpiredAsync_returns_exactly_the_bookings_the_decider_releases`.

**Proof:** That test seeds one booking on each side of every boundary and status, and
holds the query's answer to the decider's.

## BKG-004 — A reminder is marked sent only after its send succeeds

**Rule:** `ReminderSentAt` is set after the reminder adapter's send returns, and never for
a booking whose send failed; a failed send is retried on the next tick.

**Why:** Marking before sending loses reminders; not marking double-sends only in the
narrow crash window below, which is the cheaper failure.

**Accepts:** A send that succeeds but crashes before the mark is persisted is sent again
on the next tick — one duplicate email in that window, chosen over durable per-message
acknowledgement machinery at this scale.

**Owner:** `SendBookingRemindersUseCase`.

**Proof:** `SendBookingRemindersUseCaseTests.A_failed_send_is_not_marked_so_the_next_tick_retries`
fails the send, asserts nothing is marked, and asserts the retry succeeds.
