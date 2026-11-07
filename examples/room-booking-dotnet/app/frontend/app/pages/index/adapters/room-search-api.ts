import { ref, type Ref } from "vue";
import { client, unwrap, type BookingView, type RoomAvailabilityView } from "../../../api";
import type { Slot } from "../ports/room-search";

interface RoomSearchEffects {
  readonly rooms: Ref<RoomAvailabilityView[]>;
  readonly searching: Ref<boolean>;
  readonly searchProblem: Ref<string | null>;
  readonly booking: Ref<"idle" | "sending">;
  readonly bookingProblem: Ref<string | null>;
  readonly lastBooking: Ref<BookingView | null>;
  readonly search: (slot: Slot) => Promise<void>;
  readonly book: (roomId: string) => Promise<void>;
}

const problemOf = (status: number, message: string | undefined): string =>
  message ?? `The request failed (${status}).`;

export function useRoomSearchApi(): RoomSearchEffects {
  const rooms = ref<RoomAvailabilityView[]>([]);
  const searching = ref(false);
  const searchProblem = ref<string | null>(null);
  const booking = ref<"idle" | "sending">("idle");
  const bookingProblem = ref<string | null>(null);
  const lastBooking = ref<BookingView | null>(null);

  const currentSlot = ref<Slot | null>(null);

  const search = async (slot: Slot): Promise<void> => {
    searching.value = true;
    searchProblem.value = null;
    lastBooking.value = null;
    const result = await client.GET("/api/rooms/availability", {
      params: { query: { startUtc: slot.startUtc, endUtc: slot.endUtc } },
    });
    const outcome = unwrap(result);
    if (outcome.ok) {
      rooms.value = outcome.data.rooms;
      currentSlot.value = slot;
    } else {
      rooms.value = [];
      searchProblem.value = problemOf(outcome.failure.status, outcome.failure.body?.message);
    }
    searching.value = false;
  };

  const book = async (roomId: string): Promise<void> => {
    const slot = currentSlot.value;
    if (slot === null) {
      return;
    }

    booking.value = "sending";
    bookingProblem.value = null;
    const result = await client.POST("/api/bookings", {
      body: { roomId, startUtc: slot.startUtc, endUtc: slot.endUtc },
    });
    const outcome = unwrap(result);
    if (outcome.ok) {
      lastBooking.value = outcome.data;
    } else {
      bookingProblem.value = problemOf(outcome.failure.status, outcome.failure.body?.message);
    }
    booking.value = "idle";
  };

  return { rooms, searching, searchProblem, booking, bookingProblem, lastBooking, search, book };
}
