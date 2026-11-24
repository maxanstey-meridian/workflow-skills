import { ref } from "vue";
import { addRoomRequest, fetchCatalog, fetchFreeRooms } from "../adapters/rooms-adapter";
import type {
  AvailabilityState,
  NewRoom,
  RoomAddResult,
  Rooms,
  RoomsCatalogState,
  TimeSlot,
} from "../ports/rooms";

export const useRoomsApi = () => {
  const catalog = ref<RoomsCatalogState>({ kind: "loading" });
  const freeRooms = ref<AvailabilityState>({ kind: "idle" });

  const loadCatalog = async (): Promise<void> => {
    catalog.value = { kind: "loading" };
    catalog.value = await fetchCatalog();
  };

  const loadFreeRooms = async (slot: TimeSlot): Promise<void> => {
    freeRooms.value = { kind: "loading" };
    freeRooms.value = await fetchFreeRooms(slot);
  };

  const addRoom = async (input: NewRoom): Promise<RoomAddResult> => {
    const result = await addRoomRequest(input);
    const current = catalog.value;
    if (result.kind === "added" && current.kind === "loaded") {
      catalog.value = { ...current, rooms: [...current.rooms, result.room] };
    }
    return result;
  };

  const implementation = { catalog, freeRooms, loadCatalog, loadFreeRooms, addRoom };
  return implementation satisfies Rooms;
};
