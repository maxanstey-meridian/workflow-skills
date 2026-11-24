import type { components } from "@cowork/contracts";
import type { Ref } from "vue";
import type { FieldErrors } from "~/shared/error-envelope";
import { useProvideInject } from "~/shared/use-provide-inject";
import type { BookingStatus } from "../logic/status";

export type Booking = components["schemas"]["BookingResponse"];

/** The slot to book: the room's id from the DTO plus ISO 8601 instants. */
export interface BookSlot {
  readonly roomId: string;
  readonly startsAt: string;
  readonly endsAt: string;
}

export type BookingsState =
  | { kind: "loading" }
  | { kind: "loaded"; bookings: readonly Booking[] }
  | { kind: "signedOut" }
  | { kind: "forbidden" }
  | { kind: "failed"; message: string };

export type BookingResult =
  | { kind: "booked" }
  | { kind: "slotTaken"; message: string }
  | { kind: "inPast"; message: string }
  | { kind: "invalid"; fieldErrors: FieldErrors }
  | { kind: "signedOut" }
  | { kind: "forbidden" }
  | { kind: "failed"; message: string };

export type BookingActionResult =
  | { kind: "done"; status: BookingStatus }
  | { kind: "signedOut" }
  | { kind: "forbidden" }
  | { kind: "failed"; message: string };

/**
 * Booking as the member sees it: book a slot, follow their own bookings, and
 * take the actions the server still offers on each one.
 */
export interface BookingCapability {
  readonly myBookings: Ref<BookingsState>;
  readonly loadMyBookings: () => Promise<void>;
  readonly book: (slot: BookSlot) => Promise<BookingResult>;
  readonly cancel: (id: string) => Promise<BookingActionResult>;
  readonly checkIn: (id: string) => Promise<BookingActionResult>;
}

export const [injectBooking, provideBooking] =
  useProvideInject<BookingCapability>("BookingCapability");
