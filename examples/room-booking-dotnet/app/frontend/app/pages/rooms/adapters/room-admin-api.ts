import { ref, type Ref } from "vue";
import { client, unwrap, type RoomView } from "../../../api";

interface RoomAdminEffects {
  readonly rooms: Ref<RoomView[]>;
  readonly loading: Ref<boolean>;
  readonly problem: Ref<string | null>;
  readonly reload: () => Promise<void>;
  readonly add: (name: string, capacity: number) => Promise<void>;
}

const problemOf = (status: number, message: string | undefined): string =>
  message ?? `The request failed (${status}).`;

export function useRoomAdminApi(): RoomAdminEffects {
  const rooms = ref<RoomView[]>([]);
  const loading = ref(false);
  const problem = ref<string | null>(null);

  const reload = async (): Promise<void> => {
    loading.value = true;
    problem.value = null;
    const result = await client.GET("/api/rooms");
    const outcome = unwrap(result);
    if (outcome.ok) {
      rooms.value = outcome.data.rooms;
    } else {
      rooms.value = [];
      problem.value = problemOf(outcome.failure.status, outcome.failure.body?.message);
    }
    loading.value = false;
  };

  const add = async (name: string, capacity: number): Promise<void> => {
    problem.value = null;
    const result = await client.POST("/api/rooms", { body: { name, capacity } });
    const outcome = unwrap(result);
    if (outcome.ok) {
      rooms.value = [...rooms.value, outcome.data].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      problem.value = problemOf(outcome.failure.status, outcome.failure.body?.message);
    }
  };

  return { rooms, loading, problem, reload: () => reload(), add };
}
