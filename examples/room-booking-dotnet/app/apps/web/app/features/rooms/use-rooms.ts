import { client } from "@cowork/contracts";
import { ref } from "vue";
import type { Ref } from "vue";
import type { ErrorResponse, RoomResponse } from "../../shared/api-types";

export interface AddRoomOutcome {
  ok: boolean;
  error?: ErrorResponse;
}

export interface Rooms {
  readonly rooms: Ref<RoomResponse[]>;
  readonly loading: Ref<boolean>;
  load(): Promise<void>;
  addRoom(name: string, capacity: number): Promise<AddRoomOutcome>;
}

export const useRooms = (): Rooms => {
  const rooms = ref<RoomResponse[]>([]);
  const loading = ref(false);

  const load = async (): Promise<void> => {
    loading.value = true;
    const result = await client.GET("/api/rooms");
    if (result.error !== undefined) {
      console.error("Could not load rooms", result.error);
    } else {
      rooms.value = result.data ?? [];
    }
    loading.value = false;
  };

  const addRoom = async (name: string, capacity: number): Promise<AddRoomOutcome> => {
    const result = await client.POST("/api/rooms", { body: { name, capacity } });
    if (result.error !== undefined) {
      return { ok: false, error: result.error };
    }
    if (result.data === undefined) {
      return { ok: false };
    }
    return { ok: true };
  };

  return { rooms, loading, load, addRoom };
};
