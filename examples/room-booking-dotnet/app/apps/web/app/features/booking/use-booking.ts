import { client } from "@cowork/contracts";
import { ref } from "vue";
import type { Ref } from "vue";
import type {
  BookingResponse,
  ErrorResponse,
  RoomDayResponse,
  RoomHoldResponse,
} from "../../shared/api-types";

export interface BookOutcome {
  ok: boolean;
  error?: ErrorResponse;
}

export interface Booking {
  readonly myBookings: Ref<BookingResponse[]>;
  readonly loadingMine: Ref<boolean>;
  loadMine(): Promise<void>;
  readonly dayHolds: Ref<RoomHoldResponse[]>;
  loadDay(roomId: string, date: string): Promise<void>;
  book(input: { roomId: string; startsAt: string; endsAt: string }): Promise<BookOutcome>;
  cancel(bookingId: string): Promise<BookOutcome>;
  checkIn(bookingId: string): Promise<BookOutcome>;
}

export const useBooking = (): Booking => {
  const myBookings = ref<BookingResponse[]>([]);
  const loadingMine = ref(false);
  const dayHolds = ref<RoomHoldResponse[]>([]);

  const loadMine = async (): Promise<void> => {
    loadingMine.value = true;
    const result = await client.GET("/api/bookings");
    if (result.error !== undefined) {
      console.error("Could not load bookings", result.error);
    } else {
      myBookings.value = result.data ?? [];
    }
    loadingMine.value = false;
  };

  const loadDay = async (roomId: string, date: string): Promise<void> => {
    const result = await client.GET("/api/rooms/{roomId}/day", {
      params: { path: { roomId }, query: { date } },
    });
    if (result.error !== undefined) {
      console.error("Could not load the room's day", result.error);
      dayHolds.value = [];
    } else {
      dayHolds.value = result.data?.holds ?? [];
    }
  };

  const book = async (input: {
    roomId: string;
    startsAt: string;
    endsAt: string;
  }): Promise<BookOutcome> => {
    const result = await client.POST("/api/bookings", { body: input });
    if (result.error !== undefined) {
      return { ok: false, error: result.error };
    }
    if (result.data === undefined) {
      return { ok: false };
    }
    return { ok: true };
  };

  const cancel = async (bookingId: string): Promise<BookOutcome> => {
    const result = await client.POST("/api/bookings/{id}/cancel", {
      params: { path: { id: bookingId } },
    });
    if (result.error !== undefined) {
      return { ok: false, error: result.error };
    }
    if (result.data === undefined) {
      return { ok: false };
    }
    return { ok: true };
  };

  const checkIn = async (bookingId: string): Promise<BookOutcome> => {
    const result = await client.POST("/api/bookings/{id}/check-in", {
      params: { path: { id: bookingId } },
    });
    if (result.error !== undefined) {
      return { ok: false, error: result.error };
    }
    if (result.data === undefined) {
      return { ok: false };
    }
    return { ok: true };
  };

  return { myBookings, loadingMine, loadMine, dayHolds, loadDay, book, cancel, checkIn };
};
