import { flushPromises } from "@vue/test-utils";
import { expect, test } from "vitest";
import MyBookings from "~/pages/bookings/components/MyBookings.vue";
import { inMemoryBooking, testBooking } from "../../support/in-memory-booking";
import { inMemorySession } from "../../support/in-memory-session";
import { mountPage } from "../../support/mount-page";

test("lists the member's bookings with the server's actions only, and settled rows take no actions", async () => {
  const booking = inMemoryBooking({
    bookings: [
      testBooking({
        id: "booking-live",
        roomName: "Studio A",
        startsAt: "2026-11-24T14:00:00Z",
        endsAt: "2026-11-24T15:00:00Z",
        status: "booked",
        availableActions: ["cancel", "checkIn"],
      }),
      testBooking({
        id: "booking-settled",
        roomName: "Quiet Room",
        status: "released",
        availableActions: [],
      }),
    ],
  });
  const wrapper = mountPage(MyBookings, { booking, session: inMemorySession() });
  await flushPromises();

  expect(wrapper.text()).toContain("Studio A");
  expect(wrapper.text()).toContain("Quiet Room");
  expect(wrapper.text()).toContain("24 Nov 2026, 14:00–15:00");
  expect(wrapper.text()).toContain("Booked");
  expect(wrapper.text()).toContain("Released (no check-in)");

  const buttonLabels = wrapper.findAll("button").map((button) => button.text());
  expect(buttonLabels).toContain("Cancel booking");
  expect(buttonLabels).toContain("Check in");
  expect(buttonLabels).toHaveLength(2);
});

test("cancelling asks for confirmation, states the consequence, and refreshes the list", async () => {
  const booking = inMemoryBooking({
    bookings: [testBooking({ id: "booking-live", availableActions: ["cancel"] })],
    refreshedBookings: [
      testBooking({ id: "booking-live", status: "cancelled", availableActions: [] }),
    ],
  });
  const wrapper = mountPage(MyBookings, { booking, session: inMemorySession() });
  await flushPromises();

  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Cancel booking")
    ?.trigger("click");

  const dialog = wrapper.find('[role="dialog"]');
  expect(dialog.exists()).toBe(true);
  expect(dialog.text()).toContain("Studio A");
  expect(dialog.text()).toContain("frees up for others");

  await dialog
    .findAll("button")
    .find((button) => button.text() === "Cancel booking")
    ?.trigger("click");
  await flushPromises();

  expect(booking.cancelledIds).toEqual(["booking-live"]);
  expect(booking.loads).toBe(2);
  expect(wrapper.text()).toContain("cancelled");
  expect(wrapper.text()).toContain("free for others again");
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});

test("keeps the booking when the member steps back out of the confirmation", async () => {
  const booking = inMemoryBooking({
    bookings: [testBooking({ id: "booking-live", availableActions: ["cancel"] })],
  });
  const wrapper = mountPage(MyBookings, { booking, session: inMemorySession() });
  await flushPromises();

  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Cancel booking")
    ?.trigger("click");
  const dialog = wrapper.find('[role="dialog"]');
  await dialog
    .findAll("button")
    .find((button) => button.text() === "Keep booking")
    ?.trigger("click");

  expect(booking.cancelledIds).toEqual([]);
  expect(booking.loads).toBe(1);
  expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
});

test("checking in refreshes the list and says the member is checked in", async () => {
  const booking = inMemoryBooking({
    bookings: [testBooking({ id: "booking-live", availableActions: ["checkIn"] })],
    refreshedBookings: [
      testBooking({ id: "booking-live", status: "checkedIn", availableActions: [] }),
    ],
  });
  const wrapper = mountPage(MyBookings, { booking, session: inMemorySession() });
  await flushPromises();

  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Check in")
    ?.trigger("click");
  await flushPromises();

  expect(booking.checkedInIds).toEqual(["booking-live"]);
  expect(booking.loads).toBe(2);
  expect(wrapper.text()).toContain("Checked in");
});
