import type { components } from "@roombooking/contracts";
import type { Ref } from "vue";
import { useProvideInject } from "~/shared/composables/useProvideInject";

type RoomDto = components["schemas"]["RoomDto"];

export interface Rooms {
  rooms: Ref<RoomDto[]>;
  isLoading: Ref<boolean>;
  errorMessage: Ref<string | null>;
  load: () => Promise<void>;
}

export const [injectRooms, provideRooms] = useProvideInject<Rooms>("Rooms");
