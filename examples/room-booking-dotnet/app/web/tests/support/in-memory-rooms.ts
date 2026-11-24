import { ref } from "vue";
import type {
  AvailabilityState,
  NewRoom,
  Room,
  RoomAddResult,
  Rooms,
  RoomsCatalogState,
  RoomLimits,
  TimeSlot,
} from "~/features/rooms";

export const testLimits: RoomLimits = { nameMaxLength: 40, capacityMin: 1, capacityMax: 500 };

export const testRoom = (id: string, name: string, capacity: number): Room => ({
  id,
  name,
  capacity,
});

const studioA = (): Room => testRoom("room-1", "Studio A", 8);
const quietRoom = (): Room => testRoom("room-2", "Quiet Room", 4);

export interface RecordedRooms {
  /** The slots the page asked availability for, in order. */
  readonly requestedSlots: TimeSlot[];
  /** The rooms the page asked to add, in order. */
  readonly addedRooms: NewRoom[];
}

export interface InMemoryRoomsOptions {
  readonly catalog?: RoomsCatalogState;
  readonly freeRooms?: AvailabilityState;
  /** The rooms returned as free for any slot the page asks about. */
  readonly freeRoomsForSlot?: readonly Room[];
  readonly addResult?: RoomAddResult;
}

export const inMemoryRooms = (options: InMemoryRoomsOptions = {}): Rooms & RecordedRooms => {
  const catalog = ref<RoomsCatalogState>(options.catalog ?? { kind: "loading" });
  const freeRooms = ref<AvailabilityState>(options.freeRooms ?? { kind: "idle" });
  const requestedSlots: TimeSlot[] = [];
  const addedRooms: NewRoom[] = [];

  const loadedCatalog = (): RoomsCatalogState =>
    options.catalog ?? {
      kind: "loaded",
      rooms: [studioA(), quietRoom()],
      limits: testLimits,
    };

  return {
    catalog,
    freeRooms,
    loadCatalog: async () => {
      catalog.value = loadedCatalog();
    },
    loadFreeRooms: async (slot) => {
      requestedSlots.push(slot);
      freeRooms.value =
        options.freeRoomsForSlot !== undefined
          ? { kind: "loaded", rooms: options.freeRoomsForSlot }
          : (options.freeRooms ?? { kind: "loaded", rooms: [studioA()] });
    },
    addRoom: async (input) => {
      addedRooms.push(input);
      const result: RoomAddResult = options.addResult ?? {
        kind: "added",
        room: testRoom(`room-${addedRooms.length}`, input.name, input.capacity),
      };
      const current = catalog.value;
      if (result.kind === "added" && current.kind === "loaded") {
        catalog.value = { ...current, rooms: [...current.rooms, result.room] };
      }
      return result;
    },
    requestedSlots,
    addedRooms,
  };
};
