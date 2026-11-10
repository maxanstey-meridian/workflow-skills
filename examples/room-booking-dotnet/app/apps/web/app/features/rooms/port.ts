import { useProvideInject } from "../../shared/use-provide-inject";
import type { Rooms } from "./use-rooms";

export type { Rooms, AddRoomOutcome } from "./use-rooms";

export const [injectRooms, provideRooms] = useProvideInject<Rooms>("Rooms");
