import { describe, expect, it } from "vitest";
import { serverRefusalText } from "~/shared/logic/refusal";

describe("server refusal text", () => {
  it("quotes the server's message verbatim", () => {
    expect(
      serverRefusalText(
        {
          code: "ROOM_ALREADY_BOOKED",
          message: "The room is already held at overlapping times.",
          errors: null,
        },
        "fallback",
      ),
    ).toBe("The room is already held at overlapping times.");
  });

  it("falls back when the refusal carries no message", () => {
    expect(serverRefusalText({ code: "X" }, "The booking was refused.")).toBe(
      "The booking was refused.",
    );
    expect(serverRefusalText(undefined, "fallback copy")).toBe("fallback copy");
  });
});
