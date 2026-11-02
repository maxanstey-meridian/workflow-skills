import { configureRivet, type components } from "@roombooking/contracts";
import { describe, expect, it } from "vitest";
import { useRivetRooms } from "~/features/rooms/composables/useRivetRooms";
import { createFakeApi } from "../../../support/fake-api";

type RoomDto = components["schemas"]["RoomDto"];

const willow: RoomDto = {
  id: "0199f6c1-0000-7000-8000-000000000201",
  name: "Willow Room",
  capacity: 8,
};

describe("useRivetRooms", () => {
  it("loads the room list", async () => {
    const api = createFakeApi({
      "GET /api/rooms": { status: 200, body: { rooms: [willow] } },
    });
    configureRivet({ baseUrl: "http://api.test", fetch: api.fetch });
    const rooms = useRivetRooms();
    await rooms.load();

    expect(rooms.rooms.value.map((room) => room.name)).toEqual(["Willow Room"]);
    expect(rooms.errorMessage.value).toBeNull();
    expect(rooms.isLoading.value).toBe(false);
  });

  it("shows its own message on an undeclared failure", async () => {
    const api = createFakeApi({
      "GET /api/rooms": {
        status: 500,
        body: { code: "UNDECLARED", message: "The rooms are unavailable." },
      },
    });
    configureRivet({ baseUrl: "http://api.test", fetch: api.fetch });
    const rooms = useRivetRooms();
    await rooms.load();

    // The contract declares success only, so the body is not treated as a
    // declared refusal message.
    expect(rooms.rooms.value).toEqual([]);
    expect(rooms.errorMessage.value).toBe("The rooms could not be loaded. Try again in a moment.");
  });
});
