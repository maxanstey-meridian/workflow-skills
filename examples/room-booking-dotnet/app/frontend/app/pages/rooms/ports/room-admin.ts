import { inject, provide, type InjectionKey, type Ref } from "vue";
import type { RoomView } from "../../../api";

/** The staff capability for the rooms page. */
export interface RoomAdminPort {
  readonly rooms: Ref<RoomView[]>;
  readonly loading: Ref<boolean>;
  readonly problem: Ref<string | null>;
  readonly reload: () => Promise<void>;
  readonly add: (name: string, capacity: number) => Promise<void>;
}

const key: InjectionKey<RoomAdminPort> = Symbol("RoomAdmin");

export const provideRoomAdmin = (implementation: RoomAdminPort): RoomAdminPort => {
  provide(key, implementation);
  return implementation;
};

export const injectRoomAdmin = (): RoomAdminPort => {
  const port = inject(key);
  if (port === undefined) {
    throw new Error("RoomAdmin was not provided by the page composition root");
  }
  return port;
};
