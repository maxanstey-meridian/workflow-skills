import { flushPromises } from "@vue/test-utils";
import { expect, test } from "vitest";
import BookRoom from "~/pages/index/components/BookRoom.vue";
import { inMemoryBooking } from "../../support/in-memory-booking";
import { inMemoryRooms, testRoom } from "../../support/in-memory-rooms";
import { inMemorySession } from "../../support/in-memory-session";
import { mountPage } from "../../support/mount-page";

const studioA = testRoom("room-1", "Studio A", 8);

const pickStartTime = async (wrapper: ReturnType<typeof mountPage>, time: string) => {
  const selects = wrapper.findAll("select");
  await selects[0]?.setValue(time);
};

test("shows the rooms free for the picked slot and books the one the member picks", async () => {
  const rooms = inMemoryRooms({ freeRoomsForSlot: [studioA] });
  const booking = inMemoryBooking();
  const wrapper = mountPage(BookRoom, {
    rooms,
    booking,
    session: inMemorySession(),
  });

  expect(wrapper.text()).toContain("Pick a start time");

  await pickStartTime(wrapper, "14:00");
  await flushPromises();

  expect(wrapper.text()).toContain("Studio A — up to 8 people");
  expect(rooms.requestedSlots[0]?.startsAt).toContain("T14:00:00");
  expect(rooms.requestedSlots[0]?.endsAt).toContain("T15:00:00");

  const roomButton = wrapper.findAll("button").find((button) => button.text().includes("Studio A"));
  await roomButton?.trigger("click");

  expect(wrapper.text()).toContain("14:00");
  expect(wrapper.text()).toContain("15:00");

  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Book this slot")
    ?.trigger("click");
  await flushPromises();

  expect(booking.bookedSlots).toEqual([
    {
      roomId: "room-1",
      startsAt: rooms.requestedSlots[0]?.startsAt,
      endsAt: rooms.requestedSlots[0]?.endsAt,
    },
  ]);
  expect(wrapper.text()).toContain("My bookings");
});

test("shows the server's message, guidance, and refreshed availability when the slot is taken", async () => {
  const rooms = inMemoryRooms({ freeRoomsForSlot: [studioA] });
  const booking = inMemoryBooking({
    bookResult: {
      kind: "slotTaken",
      message: "That room is already booked for a time overlapping this slot.",
    },
  });
  const wrapper = mountPage(BookRoom, {
    rooms,
    booking,
    session: inMemorySession(),
  });

  await pickStartTime(wrapper, "14:00");
  await flushPromises();
  await wrapper
    .findAll("button")
    .find((button) => button.text().includes("Studio A"))
    ?.trigger("click");
  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Book this slot")
    ?.trigger("click");
  await flushPromises();

  expect(wrapper.text()).toContain("That room is already booked for a time overlapping this slot.");
  expect(wrapper.text()).toContain("Pick another room or another time");
  expect(rooms.requestedSlots.length).toBe(2);
});
