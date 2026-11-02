import { client, type components } from "@roombooking/contracts";
import { ref, watch } from "vue";
import { injectSession } from "~/features/session";
import { serverRefusalText } from "~/shared/logic/refusal";

type BookingDto = components["schemas"]["BookingDto"];

/**
 * The acting member's bookings, with the server's decision about what each
 * still allows (`availableActions`). Check-in and cancel send nothing but the
 * booking id; the server re-decides and its refusals surface as banners.
 */
export const useRivetBookings = () => {
  const session = injectSession();
  const bookings = ref<BookingDto[]>([]);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const refusalMessage = ref<string | null>(null);

  const load = async (): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const result = await client.GET("/api/bookings/mine");
      // The contract declares success only; anything else is an undeclared
      // refusal, so the body's message is not relied on here.
      if (!result.response.ok) {
        errorMessage.value = "Your bookings could not be loaded. Try again in a moment.";
        return;
      }
      bookings.value = result.data?.bookings ?? [];
    } catch {
      errorMessage.value = "Can't reach the booking service. Check it's running, then try again.";
    } finally {
      isLoading.value = false;
    }
  };

  const replaceBooking = (updated: BookingDto): void => {
    bookings.value = bookings.value.map((booking) =>
      booking.id === updated.id ? updated : booking,
    );
  };

  const checkIn = async (id: string): Promise<boolean> => {
    refusalMessage.value = null;
    try {
      const result = await client.POST("/api/bookings/{id}/check-in", { params: { path: { id } } });
      if (result.error !== undefined) {
        refusalMessage.value = serverRefusalText(
          result.error,
          "Check-in was refused. Try again in a moment.",
        );
        return false;
      }
      replaceBooking(result.data);
      return true;
    } catch {
      refusalMessage.value = "Can't reach the booking service. Check it's running, then try again.";
      return false;
    }
  };

  const cancel = async (id: string): Promise<boolean> => {
    refusalMessage.value = null;
    try {
      const result = await client.POST("/api/bookings/{id}/cancel", { params: { path: { id } } });
      if (result.error !== undefined) {
        refusalMessage.value = serverRefusalText(
          result.error,
          "The booking was not cancelled. Try again in a moment.",
        );
        return false;
      }
      replaceBooking(result.data);
      return true;
    } catch {
      refusalMessage.value = "Can't reach the booking service. Check it's running, then try again.";
      return false;
    }
  };

  // Load only what the session allows: /api/bookings/mine is member-only, so a
  // staff user gets nothing (and no refusal banner for asking).
  const loadIfAllowed = (): void => {
    if (session.capabilities.value?.canBookRooms === true) {
      void load();
    }
  };

  // Switching the acting user changes whose bookings these are.
  watch(
    () => session.actingAs.value.email,
    () => {
      loadIfAllowed();
    },
  );

  watch(
    () => session.capabilities.value?.canBookRooms,
    (canBook) => {
      if (canBook === true) {
        void load();
      }
    },
  );

  loadIfAllowed();

  return { bookings, isLoading, errorMessage, refusalMessage, checkIn, cancel };
};
