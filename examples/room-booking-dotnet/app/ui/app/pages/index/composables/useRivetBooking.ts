import { client, type components } from "@roombooking/contracts";
import { ref } from "vue";
import { serverRefusalText } from "~/shared/logic/refusal";

type BookingDto = components["schemas"]["BookingDto"];

/** Books a room for the picked slot. Refusals (409/422) surface as banners
 * quoting the server's message. */
export const useRivetBooking = () => {
  const bookedBooking = ref<BookingDto | null>(null);
  const refusalMessage = ref<string | null>(null);
  const isBooking = ref(false);

  const book = async (roomId: string, start: string, end: string): Promise<boolean> => {
    isBooking.value = true;
    refusalMessage.value = null;
    try {
      const result = await client.POST("/api/bookings", { body: { roomId, start, end } });
      if (result.error !== undefined) {
        refusalMessage.value = serverRefusalText(
          result.error,
          "The booking was refused. Change the details and try again.",
        );
        return false;
      }
      if (result.data === undefined) {
        refusalMessage.value = "The booking was refused. Change the details and try again.";
        return false;
      }
      bookedBooking.value = result.data;
      return true;
    } catch {
      refusalMessage.value = "Can't reach the booking service. Check it's running, then try again.";
      return false;
    } finally {
      isBooking.value = false;
    }
  };

  const reset = (): void => {
    bookedBooking.value = null;
    refusalMessage.value = null;
  };

  return { bookedBooking, refusalMessage, isBooking, book, reset };
};
