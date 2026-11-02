import { mountSuspended } from "@nuxt/test-utils/runtime";
import { configureRivet, type components } from "@roombooking/contracts";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { computed, defineComponent, h, ref } from "vue";
import { provideSession, type Session } from "~/features/session";
import MyBookings from "~/pages/my-bookings.vue";
import { createFakeApi, type FakeRoute } from "../support/fake-api";
import {
  amaraSession,
  benSession,
  checkInableBooking,
  windowClosedBooking,
} from "../support/fixtures";

type BookingDto = components["schemas"]["BookingDto"];

/** A stand-in for the app shell: provides the session capability the page injects. */
const fakeSession = (session: components["schemas"]["SessionResponse"]): Session => ({
  user: ref(session.user),
  capabilities: ref(session.capabilities),
  actingAs: computed(() => ({ email: session.user.email, name: session.user.name })),
  isLoading: ref(false),
  errorMessage: ref(null),
  load: async () => {},
  switchTo: async () => {},
});

const mountBookings = async (session: Session, routes: Record<string, FakeRoute>) => {
  const api = createFakeApi(routes);
  configureRivet({ baseUrl: "http://api.test", fetch: api.fetch });
  const Shell = defineComponent({
    setup() {
      provideSession(session);
      return () => h(MyBookings);
    },
  });
  const wrapper = await mountSuspended(Shell, { route: "/my-bookings" });
  await flushPromises();
  return { wrapper, api };
};

const findButton = (wrapper: Awaited<ReturnType<typeof mountBookings>>["wrapper"], label: string) =>
  wrapper.findAll("button").find((button) => button.text().trim() === label);

describe("my bookings page", () => {
  it("renders what the server allows on each booking and quotes refusals", async () => {
    const bookings: BookingDto[] = [checkInableBooking, windowClosedBooking];
    const { wrapper, api } = await mountBookings(fakeSession(benSession), {
      "GET /api/bookings/mine": { status: 200, body: { bookings } },
      "POST /api/bookings/0199f6c1-0000-7000-8000-000000000101/cancel": {
        status: 409,
        body: {
          code: "ALREADY_CANCELLED",
          message: "This booking is already cancelled.",
          errors: null,
        },
      },
    });

    expect(wrapper.text()).toContain("Willow Room");
    expect(wrapper.text()).toContain("Alder Room");
    expect(wrapper.text()).toContain("Mon 2 Nov 2026, 14:00–15:00");
    // The consequence copy travels with the server's deadline.
    expect(wrapper.text()).toContain("Check in by 14:15 or the room is released.");

    const checkInButtons = wrapper
      .findAll("button")
      .filter((button) => button.text().trim() === "Check in");
    expect(checkInButtons).toHaveLength(1);
    const cancelButtons = wrapper
      .findAll("button")
      .filter((button) => button.text().trim() === "Cancel booking");
    expect(cancelButtons).toHaveLength(2);

    const firstCancel = cancelButtons[0];
    if (firstCancel === undefined) {
      throw new Error("expected a cancel button");
    }
    await firstCancel.trigger("click");
    await flushPromises();

    const confirmButton = findButton(wrapper, "Yes, cancel it");
    if (confirmButton === undefined) {
      throw new Error("expected a confirm button");
    }
    await confirmButton.trigger("click");
    await flushPromises();

    expect(
      api.requests.some(
        (request) =>
          request.method === "POST" &&
          request.path === "/api/bookings/0199f6c1-0000-7000-8000-000000000101/cancel",
      ),
    ).toBe(true);
    expect(wrapper.text()).toContain("This booking is already cancelled.");
  });

  it("explains itself to staff instead of offering booking actions", async () => {
    const { wrapper, api } = await mountBookings(fakeSession(amaraSession), {
      "GET /api/bookings/mine": { status: 200, body: { bookings: [] } },
    });

    expect(wrapper.text()).toContain("Only members book rooms");
    expect(wrapper.text()).not.toContain("Cancel booking");
    expect(api.requests.some((request) => request.path === "/api/bookings/mine")).toBe(false);
  });
});
