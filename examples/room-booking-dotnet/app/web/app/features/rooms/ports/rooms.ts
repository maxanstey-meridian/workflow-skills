import type { components } from "@cowork/contracts";
import type { Ref } from "vue";
import type { FieldErrors } from "~/shared/error-envelope";
import { useProvideInject } from "~/shared/use-provide-inject";

export type Room = components["schemas"]["RoomResponse"];
export type RoomLimits = components["schemas"]["RoomLimitsResponse"];

/** The exact slot a member wants to book, as ISO 8601 instants. */
export interface TimeSlot {
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface NewRoom {
  readonly name: string;
  readonly capacity: number;
}

/**
 * The rooms catalogue: every bookable room plus the limits the add-room form
 * validates against, and the rooms free for a given slot.
 */
export type RoomsCatalogState =
  | { kind: "loading" }
  | { kind: "loaded"; rooms: readonly Room[]; limits: RoomLimits }
  | { kind: "signedOut" }
  | { kind: "forbidden" }
  | { kind: "failed"; message: string };

export type AvailabilityState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; rooms: readonly Room[] }
  | { kind: "signedOut" }
  | { kind: "forbidden" }
  | { kind: "failed"; message: string };

export type RoomAddResult =
  | { kind: "added"; room: Room }
  | { kind: "invalid"; fieldErrors: FieldErrors }
  | { kind: "signedOut" }
  | { kind: "forbidden" }
  | { kind: "failed"; message: string };

export interface Rooms {
  readonly catalog: Ref<RoomsCatalogState>;
  readonly freeRooms: Ref<AvailabilityState>;
  readonly loadCatalog: () => Promise<void>;
  readonly loadFreeRooms: (slot: TimeSlot) => Promise<void>;
  readonly addRoom: (input: NewRoom) => Promise<RoomAddResult>;
}

export const [injectRooms, provideRooms] = useProvideInject<Rooms>("Rooms");
