import { flushPromises } from "@vue/test-utils";
import { expect, test } from "vitest";
import RoomsList from "~/pages/rooms/components/RoomsList.vue";
import { inMemoryRooms, testLimits } from "../../support/in-memory-rooms";
import { inMemorySession } from "../../support/in-memory-session";
import { mountPage } from "../../support/mount-page";

const nameInput = (wrapper: ReturnType<typeof mountPage>) =>
  wrapper.find("input:not([type='number'])");

const capacityInput = (wrapper: ReturnType<typeof mountPage>) =>
  wrapper.find("input[type='number']");

test("lists the rooms with their capacity and the form limits come from the DTO", async () => {
  const rooms = inMemoryRooms();
  const wrapper = mountPage(RoomsList, { rooms, session: inMemorySession() });
  await flushPromises();

  expect(wrapper.text()).toContain("Studio A");
  expect(wrapper.text()).toContain("Up to 8 people");
  expect(wrapper.text()).toContain("Quiet Room");

  expect(nameInput(wrapper).attributes("maxlength")).toBe(String(testLimits.nameMaxLength));
  expect(capacityInput(wrapper).attributes("min")).toBe(String(testLimits.capacityMin));
  expect(capacityInput(wrapper).attributes("max")).toBe(String(testLimits.capacityMax));
});

test("adds a room and it appears in the list", async () => {
  const rooms = inMemoryRooms();
  const wrapper = mountPage(RoomsList, { rooms, session: inMemorySession() });
  await flushPromises();

  await nameInput(wrapper).setValue("Studio B");
  await capacityInput(wrapper).setValue("12");
  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Add room")
    ?.trigger("click");
  await flushPromises();

  expect(rooms.addedRooms).toEqual([{ name: "Studio B", capacity: 12 }]);
  expect(wrapper.text()).toContain("Studio B");
  expect(nameInput(wrapper).element.value).toBe("");
});

test("shows fast required-field feedback without calling the API", async () => {
  const rooms = inMemoryRooms();
  const wrapper = mountPage(RoomsList, { rooms, session: inMemorySession() });
  await flushPromises();

  await capacityInput(wrapper).setValue("12");
  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Add room")
    ?.trigger("click");

  const alerts = wrapper.findAll("[role='alert']").map((alert) => alert.text());
  expect(alerts.join(" ")).toContain("Enter a name");
  expect(rooms.addedRooms).toEqual([]);
});

test("shows the server's per-field errors on a failed validation", async () => {
  const rooms = inMemoryRooms({
    addResult: {
      kind: "invalid",
      fieldErrors: { Name: ["The name is already in use."] },
    },
  });
  const wrapper = mountPage(RoomsList, { rooms, session: inMemorySession() });
  await flushPromises();

  await nameInput(wrapper).setValue("Studio A");
  await capacityInput(wrapper).setValue("12");
  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Add room")
    ?.trigger("click");
  await flushPromises();

  expect(wrapper.text()).toContain("The name is already in use.");
});

test("explains the staff prerequisite when the persona may not add rooms", async () => {
  const rooms = inMemoryRooms({ addResult: { kind: "forbidden" } });
  const wrapper = mountPage(RoomsList, { rooms, session: inMemorySession() });
  await flushPromises();

  await nameInput(wrapper).setValue("Studio B");
  await capacityInput(wrapper).setValue("12");
  await wrapper
    .findAll("button")
    .find((button) => button.text() === "Add room")
    ?.trigger("click");
  await flushPromises();

  expect(wrapper.text()).toContain("Only staff can add rooms.");
  expect(wrapper.text()).toContain("Maya");
  expect(wrapper.find("form").exists()).toBe(false);
});
