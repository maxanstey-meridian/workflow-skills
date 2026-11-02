# Bookings — invariants

Each entry: the rule as it holds now, why it exists, what it deliberately costs, the
boundary that owns it, and the test that would fail if the owner stopped enforcing it.

## BOOKINGS-001: A room is never held by two active bookings at overlapping times

**Rule:** For every room, the half-open holds `[Start, HeldUntil)` of bookings with
status `Booked` or `CheckedIn` never overlap. A booking holds `[Start, min(End,
Start+15min))` until its member checks in, and `[Start, End)` once checked in. A refused
overlap is a declared failure: `ROOM_ALREADY_BOOKED` on booking, `ROOM_NO_LONGER_HELD`
when a check-in would extend a hold over a rebooked tail.

**Why:** a room cannot host two bookings at once; every other rule in this module
protects this promise.

**Accepts:** time is half-open, so back-to-back slots (`A` ends 11:00, `B` starts 11:00)
coexist. Until the holder checks in, the tail after the 15-minute hold stays bookable by
others; a late check-in that would collide fails instead of displacing them.

**Owner:** the `bookings_room_no_overlap` exclusion constraint (`btree_gist` on
`room_id` + `tstzrange(starts_at, held_until)` where `status IN (1, 2)`, migration
`AddBookings`), with `Booking.Reserve`'s `HeldUntil` semantics; the repository translates
Postgres `23P01` into the declared failures.

**Proof:** `BookingConcurrencyTests` (two concurrent booking requests behind one barrier:
exactly one 201, one 409, one active row; direct-`DbContext` overlap raises `23P01`),
`BookingsTests.A_check_in_that_would_overlap_a_rebooked_tail_is_refused`.

## BOOKINGS-002: An unclaimed booking stops holding its room 15 minutes after its start

**Rule:** `Booking.Reserve` sets `HeldUntil = min(End, Start + CheckInGrace)`;
`ReleaseStaleBookingsUseCase` atomically sets every still-`Booked` booking whose
`HeldUntil` has passed to `Released` (`ReleaseDueAsync`'s one conditional `UPDATE`). A
checked-in booking is never released this way. The boundary is inclusive: a hold lapses
at exactly `HeldUntil`.

**Why:** a no-show must return the room to the pool, and the same constant
(`BookingRules.CheckInGrace`) drives the check-in window and the "check in by 14:15"
copy, so the hold and the window can never drift apart.

**Accepts:** the sweep is periodic (30 s), so a released room can stay marked `Booked`
for up to one sweep interval after its hold lapses; this only delays the status flip,
never the room's availability (the expired hold overlaps no future booking anyway).

**Owner:** `Booking.Reserve` (semantics) with `ReleaseStaleBookingsUseCase` and
`IBookingRepository.ReleaseDueAsync` (enforcement).

**Proof:** `BookingSweepsTests.The_release_sweep_lets_a_lapsed_hold_go_and_frees_the_slot`
(none at 10:14:59, released at 10:16, room rebookable),
`BookingSweepsTests.A_checked_in_booking_is_never_released`.

## BOOKINGS-003: Every due booking gets its reminder email at least once

**Rule:** a booking that is active (`Booked` or `CheckedIn`), has no `ReminderSentAt`,
and whose reminder instant has passed — the evening before its `Start`, at the
configured wall time in the configured zone — receives one reminder email naming the
room, addressed to the member's email; `MarkReminderSent` is saved only after the send.

**Why:** members must hear the evening before; the mail is the product's only
notification channel.

**Accepts:** at-least-once — a crash between send and mark re-sends the same reminder on
a later run. A member who cancels after the evening's send may still have received it.

**Owner:** `SendDueBookingRemindersUseCase`.

**Proof:** `BookingSweepsTests.The_reminder_sweep_sends_once_on_the_evening_before`
(none at 18:29, exactly one at 18:31, no duplicate on re-run),
`BookingSweepsTests.A_cancelled_booking_gets_no_reminder`.

## BOOKINGS-004: Check-in opens at the start and closes 15 minutes after

**Rule:** `CheckIn` is refused before `Start` (`CHECK_IN_NOT_OPEN`) and from
`Start + BookingRules.CheckInGrace` onwards (`CHECK_IN_WINDOW_CLOSED`); inside the
window it records `CheckInAt` and extends the hold to `End`. Cancel refuses only once
the slot has ended (`ALREADY_ENDED`); both refusals come from the one decider.

**Why:** the check-in window is exactly the hold window — the member who checks in
within 15 minutes claims the room for the whole slot, and the one who doesn't loses it;
`availableActions` and `checkInClosesAt` on the read model must agree with what the use
cases will enforce.

**Owner:** `BookingLifecycle` (the one pure decider) guarding
`CheckInBookingUseCase` and `CancelBookingUseCase`, and feeding every read model.

**Proof:** `BookingLifecycleTests` (both actions across before start / inside window /
at close / after close / after end / already checked in / cancelled / released, with
`Available` consistent with `Refusal`), the check-in rows in `BookingsTests`.
