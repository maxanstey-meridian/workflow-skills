import { client } from "@cowork/contracts";
import { fieldErrorsOf, unreachableMessage } from "~/shared/error-envelope";
import type {
  AvailabilityState,
  NewRoom,
  RoomAddResult,
  RoomsCatalogState,
  TimeSlot,
} from "../ports/rooms";

const catalogFailedMessage = "The rooms could not be loaded.";
const availabilityFailedMessage = "It is not known which rooms are free for this slot.";
const addFailedMessage = "The room could not be added.";

export const fetchCatalog = async (): Promise<RoomsCatalogState> => {
  try {
    const result = await client.GET("/api/rooms");
    if (result.response.status === 401) {
      return { kind: "signedOut" };
    }
    if (result.response.status === 403) {
      return { kind: "forbidden" };
    }
    if (result.data === undefined) {
      return { kind: "failed", message: catalogFailedMessage };
    }
    return { kind: "loaded", rooms: result.data.rooms, limits: result.data.limits };
  } catch {
    return { kind: "failed", message: unreachableMessage };
  }
};

export const fetchFreeRooms = async (slot: TimeSlot): Promise<AvailabilityState> => {
  try {
    const result = await client.GET("/api/rooms/available", {
      params: { query: { startsAt: slot.startsAt, endsAt: slot.endsAt } },
    });
    if (result.response.status === 401) {
      return { kind: "signedOut" };
    }
    if (result.response.status === 403) {
      return { kind: "forbidden" };
    }
    if (result.data === undefined) {
      return { kind: "failed", message: availabilityFailedMessage };
    }
    return { kind: "loaded", rooms: result.data.rooms };
  } catch {
    return { kind: "failed", message: unreachableMessage };
  }
};

export const addRoomRequest = async (input: NewRoom): Promise<RoomAddResult> => {
  try {
    const result = await client.POST("/api/rooms", {
      body: { name: input.name, capacity: input.capacity },
    });
    if (result.response.status === 401) {
      return { kind: "signedOut" };
    }
    if (result.response.status === 403) {
      return { kind: "forbidden" };
    }
    if (result.error !== undefined) {
      return result.error.code === "validation.failed"
        ? { kind: "invalid", fieldErrors: fieldErrorsOf(result.error.errors) }
        : { kind: "failed", message: result.error.message };
    }
    if (result.data === undefined) {
      return { kind: "failed", message: addFailedMessage };
    }
    return { kind: "added", room: result.data };
  } catch {
    return { kind: "failed", message: unreachableMessage };
  }
};
