import { inject, provide, type InjectionKey, type Ref } from "vue";
import type { RoomAvailabilityView, BookingView } from "../../../api";

/** The half-open slot the member picked, sent to the server as UTC instants. */
export interface Slot {
  readonly startUtc: string;
  readonly endUtc: string;
}

export interface RoomSearchPort {
  /** Server rows for the slot just searched: whether each room is free is the server's word. */
  readonly rooms: Ref<RoomAvailabilityView[]>;
  readonly searching: Ref<boolean>;
  readonly searchProblem: Ref<string | null>;
  readonly booking: Ref<"idle" | "sending">;
  readonly bookingProblem: Ref<string | null>;
  /** The booking just made, for the confirmation outcome. */
  readonly lastBooking: Ref<BookingView | null>;
  readonly search: (slot: Slot) => Promise<void>;
  /** Books the room for the slot searched last — the scene lives in the context. */
  readonly book: (roomId: string) => Promise<void>;
}

const key: InjectionKey<RoomSearchPort> = Symbol("RoomSearch");

export const provideRoomSearch = (implementation: RoomSearchPort): RoomSearchPort => {
  provide(key, implementation);
  return implementation;
};

export const injectRoomSearch = (): RoomSearchPort => {
  const port = inject(key);
  if (port === undefined) {
    throw new Error("RoomSearch was not provided by the page composition root");
  }
  return port;
};
