import { beforeEach, describe, expect, it } from "vitest";
import {
  readActingAsEmail,
  writeActingAsEmail,
} from "~/features/session/adapters/acting-as-storage";

describe("acting-as storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("falls back to the seeded member on a fresh browser", () => {
    expect(readActingAsEmail()).toBe("ben@roombooking.dev");
  });

  it("keeps the chosen user for the next visit", () => {
    writeActingAsEmail("amara@roombooking.dev");
    expect(readActingAsEmail()).toBe("amara@roombooking.dev");
  });
});
