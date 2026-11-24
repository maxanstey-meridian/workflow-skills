import { client } from "@cowork/contracts";
import { fieldErrorsOf, unreachableMessage, type ErrorEnvelope } from "~/shared/error-envelope";
import type { BookingActionResult, BookingResult, BookSlot, BookingsState } from "../ports/booking";

const bookingsFailedMessage = "Your bookings could not be loaded.";
const bookFailedMessage = "The booking could not be made.";
const actionFailedMessage = "The change could not be made.";

const bookingErrorResult = (envelope: ErrorEnvelope): BookingResult => {
  switch (envelope.code) {
    case "booking.slot_taken":
      return { kind: "slotTaken", message: envelope.message };
    case "time.in_past":
      return { kind: "inPast", message: envelope.message };
    case "validation.failed":
      return { kind: "invalid", fieldErrors: fieldErrorsOf(envelope.errors) };
    case "room.not_found":
      return { kind: "failed", message: envelope.message };
    default:
      return { kind: "failed", message: envelope.message };
  }
};

const actionErrorResult = (message: string): BookingActionResult => ({
  kind: "failed",
  message,
});

export const fetchMyBookings = async (): Promise<BookingsState> => {
  try {
    const result = await client.GET("/api/bookings/mine");
    if (result.response.status === 401) {
      return { kind: "signedOut" };
    }
    if (result.response.status === 403) {
      return { kind: "forbidden" };
    }
    if (result.data === undefined) {
      return { kind: "failed", message: bookingsFailedMessage };
    }
    return { kind: "loaded", bookings: result.data.bookings };
  } catch {
    return { kind: "failed", message: unreachableMessage };
  }
};

export const bookRoomRequest = async (slot: BookSlot): Promise<BookingResult> => {
  try {
    const result = await client.POST("/api/bookings", {
      body: { roomId: slot.roomId, startsAt: slot.startsAt, endsAt: slot.endsAt },
    });
    if (result.response.status === 401) {
      return { kind: "signedOut" };
    }
    if (result.response.status === 403) {
      return { kind: "forbidden" };
    }
    if (result.error !== undefined) {
      return bookingErrorResult(result.error);
    }
    if (result.data === undefined) {
      return { kind: "failed", message: bookFailedMessage };
    }
    return { kind: "booked" };
  } catch {
    return { kind: "failed", message: unreachableMessage };
  }
};

export const cancelBookingRequest = async (id: string): Promise<BookingActionResult> => {
  try {
    const result = await client.POST("/api/bookings/{id}/cancel", {
      params: { path: { id } },
    });
    if (result.response.status === 401) {
      return { kind: "signedOut" };
    }
    if (result.response.status === 403) {
      return { kind: "forbidden" };
    }
    if (result.error !== undefined) {
      return actionErrorResult(result.error.message);
    }
    if (result.data === undefined) {
      return { kind: "failed", message: actionFailedMessage };
    }
    return { kind: "done", status: result.data.status };
  } catch {
    return { kind: "failed", message: unreachableMessage };
  }
};

export const checkInBookingRequest = async (id: string): Promise<BookingActionResult> => {
  try {
    const result = await client.POST("/api/bookings/{id}/check-in", {
      params: { path: { id } },
    });
    if (result.response.status === 401) {
      return { kind: "signedOut" };
    }
    if (result.response.status === 403) {
      return { kind: "forbidden" };
    }
    if (result.error !== undefined) {
      return actionErrorResult(result.error.message);
    }
    if (result.data === undefined) {
      return { kind: "failed", message: actionFailedMessage };
    }
    return { kind: "done", status: result.data.status };
  } catch {
    return { kind: "failed", message: unreachableMessage };
  }
};
