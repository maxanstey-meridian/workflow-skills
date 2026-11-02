import { client, type components } from "@roombooking/contracts";
import { ref, watch, type Ref } from "vue";
import { injectRooms } from "~/features/rooms";
import { busyRows, type BusyRow } from "../logic/availability";

type RoomDto = components["schemas"]["RoomDto"];

/**
 * What is already held for every listed room on the picked day, so members see
 * when rooms are taken before they choose a time. Rendering only — the server
 * still refuses bookings itself.
 */
export const useRivetAvailability = (dateKey: Ref<string>) => {
  const rooms = injectRooms();
  const busyByRoomId = ref<Record<string, BusyRow[]>>({});
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const load = async (roomList: RoomDto[], date: string): Promise<void> => {
    if (roomList.length === 0) {
      busyByRoomId.value = {};
      return;
    }
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const perRoom = await Promise.all(
        roomList.map(async (room) => {
          const result = await client.GET("/api/rooms/{roomId}/availability", {
            params: { path: { roomId: room.id }, query: { date } },
          });
          // Success only is declared; a failed read just leaves the card quiet
          // while the page's banner explains the problem.
          const rows: BusyRow[] = result.response.ok ? busyRows(result.data?.busy ?? []) : [];
          return { roomId: room.id, rows };
        }),
      );
      busyByRoomId.value = Object.fromEntries(perRoom.map((entry) => [entry.roomId, entry.rows]));
    } catch {
      busyByRoomId.value = {};
      errorMessage.value =
        "Can't load what's already taken. Check the service is running, then pick the day again.";
    } finally {
      isLoading.value = false;
    }
  };

  watch(
    [() => rooms.rooms.value, dateKey],
    ([roomList, date]) => {
      void load(roomList, date);
    },
    { immediate: true },
  );

  return { busyByRoomId, isLoading, errorMessage };
};
