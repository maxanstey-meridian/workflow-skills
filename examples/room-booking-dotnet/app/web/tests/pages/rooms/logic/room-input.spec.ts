import { describe, expect, test } from "vitest";
import { fieldMessage, roomInputErrors } from "~/pages/rooms/logic/room-input";

describe("roomInputErrors", () => {
  test("accepts a filled-in room", () => {
    expect(roomInputErrors("Studio A", "12")).toEqual({});
  });

  test("rejects an empty name", () => {
    expect(roomInputErrors("   ", "12")).toEqual({ Name: [expect.any(String)] });
  });

  test("rejects a missing capacity", () => {
    expect(roomInputErrors("Studio A", "")).toEqual({ Capacity: [expect.any(String)] });
  });

  test("rejects a capacity that is not a number", () => {
    expect(roomInputErrors("Studio A", "many")).toEqual({ Capacity: [expect.any(String)] });
  });
});

describe("fieldMessage", () => {
  test("joins a field's messages however the server spelled the key", () => {
    const errors = { Name: ["Name is too long.", "Name is taken."] };
    expect(fieldMessage(errors, "name")).toBe("Name is too long. Name is taken.");
  });

  test("finds a field the server spelled in uppercase", () => {
    const errors = { Capacity: ["Capacity must be between 1 and 500."] };
    expect(fieldMessage(errors, "capacity")).toBe("Capacity must be between 1 and 500.");
  });

  test("is undefined when the server sent nothing for the field", () => {
    expect(fieldMessage({ Name: ["Required"] }, "capacity")).toBeUndefined();
  });
});
