import { client, type components } from "@roombooking/contracts";
import { ref } from "vue";
import type { Rooms } from "../ports/rooms";

type RoomDto = components["schemas"]["RoomDto"];

export const useRivetRooms = (): Rooms => {
  const rooms = ref<RoomDto[]>([]);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const load = async (): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const result = await client.GET("/api/rooms");
      // The contract declares success only; anything else is an undeclared
      // refusal, so the body's message is not relied on here.
      if (!result.response.ok) {
        errorMessage.value = "The rooms could not be loaded. Try again in a moment.";
        return;
      }
      rooms.value = result.data?.rooms ?? [];
    } catch {
      errorMessage.value = "Can't reach the booking service. Check it's running, then try again.";
    } finally {
      isLoading.value = false;
    }
  };

  return { rooms, isLoading, errorMessage, load } satisfies Rooms;
};
