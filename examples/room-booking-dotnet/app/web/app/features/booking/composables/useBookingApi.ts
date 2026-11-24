import { ref } from "vue";
import {
  bookRoomRequest,
  cancelBookingRequest,
  checkInBookingRequest,
  fetchMyBookings,
} from "../adapters/booking-adapter";
import type {
  BookingActionResult,
  BookingCapability,
  BookingResult,
  BookSlot,
  BookingsState,
} from "../ports/booking";

export const useBookingApi = () => {
  const myBookings = ref<BookingsState>({ kind: "loading" });

  const loadMyBookings = async (): Promise<void> => {
    myBookings.value = { kind: "loading" };
    myBookings.value = await fetchMyBookings();
  };

  const book = async (slot: BookSlot): Promise<BookingResult> => bookRoomRequest(slot);

  const cancel = async (id: string): Promise<BookingActionResult> => {
    const result = await cancelBookingRequest(id);
    if (result.kind === "done") {
      await loadMyBookings();
    }
    return result;
  };

  const checkIn = async (id: string): Promise<BookingActionResult> => {
    const result = await checkInBookingRequest(id);
    if (result.kind === "done") {
      await loadMyBookings();
    }
    return result;
  };

  const implementation = { myBookings, loadMyBookings, book, cancel, checkIn };
  return implementation satisfies BookingCapability;
};
