import { mount } from "@vue/test-utils";
import { defineComponent, h, type Component } from "vue";
import { provideBooking, type BookingCapability } from "~/features/booking";
import { provideRooms, type Rooms } from "~/features/rooms";
import { provideSession, type Session } from "~/features/session";
import { uiComponents } from "./ui-stubs";

export interface PagePorts {
  readonly session?: Session;
  readonly rooms?: Rooms;
  readonly booking?: BookingCapability;
}

/**
 * Mounts a page container below a test composition root that provides the
 * given port implementations, with the Nuxt UI components stood in by plain
 * HTML doubles.
 */
export const mountPage = (component: Component, ports: PagePorts) =>
  mount(
    defineComponent({
      name: "PageTestRoot",
      setup() {
        if (ports.session !== undefined) {
          provideSession(ports.session);
        }
        if (ports.rooms !== undefined) {
          provideRooms(ports.rooms);
        }
        if (ports.booking !== undefined) {
          provideBooking(ports.booking);
        }
        return () => h(component);
      },
    }),
    { global: { components: uiComponents } },
  );
