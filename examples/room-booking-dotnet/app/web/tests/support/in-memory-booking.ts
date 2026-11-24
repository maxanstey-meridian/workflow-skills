import { ref } from "vue";
import type {
  Booking,
  BookingActionResult,
  BookingCapability,
  BookingResult,
  BookingsState,
  BookSlot,
} from "~/features/booking";

export const testBooking = (overrides: Partial<Booking> = {}): Booking => ({
  id: "booking-1",
  roomId: "room-1",
  roomName: "Studio A",
  startsAt: "2026-11-24T14:00:00Z",
  endsAt: "2026-11-24T15:00:00Z",
  status: "booked",
  availableActions: ["cancel", "checkIn"],
  ...overrides,
});

export interface RecordedBookings {
  /** The slots the page asked to book, in order. */
  readonly bookedSlots: BookSlot[];
  /** The booking ids the page asked to cancel, in order. */
  readonly cancelledIds: string[];
  /** The booking ids the page asked to check in, in order. */
  readonly checkedInIds: string[];
  /** How often the page reloaded the list. */
  readonly loads: number;
}

export interface InMemoryBookingOptions {
  readonly bookings?: readonly Booking[];
  /** The list state after a reload, e.g. showing the effect of an action. */
  readonly refreshedBookings?: readonly Booking[];
  readonly bookResult?: BookingResult;
  readonly cancelResult?: BookingActionResult;
  readonly checkInResult?: BookingActionResult;
}

export const inMemoryBooking = (
  options: InMemoryBookingOptions = {},
): BookingCapability & RecordedBookings => {
  const myBookings = ref<BookingsState>({ kind: "loaded", bookings: options.bookings ?? [] });
  const bookedSlots: BookSlot[] = [];
  const cancelledIds: string[] = [];
  const checkedInIds: string[] = [];
  let loads = 0;
  let actionTaken = false;

  const loadMyBookings = async (): Promise<void> => {
    loads += 1;
    const list = actionTaken
      ? (options.refreshedBookings ?? options.bookings ?? [])
      : (options.bookings ?? []);
    myBookings.value = { kind: "loaded", bookings: [...list] };
  };

  const finishAction = async (result: BookingActionResult): Promise<BookingActionResult> => {
    if (result.kind === "done") {
      actionTaken = true;
      await loadMyBookings();
    }
    return result;
  };

  return {
    myBookings,
    loadMyBookings,
    book: async (slot) => {
      bookedSlots.push(slot);
      return options.bookResult ?? { kind: "booked" };
    },
    cancel: async (id) => {
      cancelledIds.push(id);
      return finishAction(options.cancelResult ?? { kind: "done", status: "cancelled" });
    },
    checkIn: async (id) => {
      checkedInIds.push(id);
      return finishAction(options.checkInResult ?? { kind: "done", status: "checkedIn" });
    },
    bookedSlots,
    cancelledIds,
    checkedInIds,
    get loads(): number {
      return loads;
    },
  };
};
