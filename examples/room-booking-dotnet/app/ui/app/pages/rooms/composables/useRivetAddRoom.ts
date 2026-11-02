import { client, type components } from "@roombooking/contracts";
import { computed, ref } from "vue";
import { injectRooms } from "~/features/rooms";

type ErrorResponse = components["schemas"]["ErrorResponse"];

/** Adds a room for staff. The server validates name and capacity; its refusal
 * (including per-field errors) travels back for the banner. */
export const useRivetAddRoom = () => {
  const rooms = injectRooms();
  const name = ref("");
  const capacity = ref("");
  const isAdding = ref(false);
  const refusal = ref<ErrorResponse | null>(null);
  const errorMessage = ref<string | null>(null);

  const canAdd = computed(
    () =>
      name.value.trim() !== "" &&
      capacity.value.trim() !== "" &&
      Number.isFinite(Number(capacity.value)),
  );

  const add = async (): Promise<boolean> => {
    isAdding.value = true;
    refusal.value = null;
    errorMessage.value = null;
    try {
      const result = await client.POST("/api/rooms", {
        body: { name: name.value.trim(), capacity: Number(capacity.value) },
      });
      if (result.error !== undefined) {
        refusal.value = result.error;
        return false;
      }
      name.value = "";
      capacity.value = "";
      await rooms.load();
      return true;
    } catch {
      errorMessage.value = "Can't reach the booking service. Check it's running, then try again.";
      return false;
    } finally {
      isAdding.value = false;
    }
  };

  return { name, capacity, isAdding, canAdd, refusal, errorMessage, add };
};
