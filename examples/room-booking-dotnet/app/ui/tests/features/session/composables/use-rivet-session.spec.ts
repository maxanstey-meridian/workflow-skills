import { configureRivet, type RivetFetch } from "@roombooking/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { useRivetSession } from "~/features/session/composables/useRivetSession";
import { createFakeApi, type FakeRoute } from "../../../support/fake-api";
import { amaraSession, benSession } from "../../../support/fixtures";

describe("useRivetSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const loadWith = (routes: Record<string, FakeRoute>) => {
    const api = createFakeApi(routes);
    configureRivet({ baseUrl: "http://api.test", fetch: api.fetch });
    return api;
  };

  it("loads the acting user and their capabilities", async () => {
    const api = loadWith({ "GET /api/session": { status: 200, body: benSession } });
    const session = useRivetSession();

    expect(session.user.value).toBeNull();
    expect(session.actingAs.value.name).toBeNull();
    await session.load();

    expect(session.user.value?.name).toBe("Ben Cohen");
    expect(session.capabilities.value).toEqual({ canManageRooms: false, canBookRooms: true });
    expect(session.actingAs.value).toEqual({ email: "ben@roombooking.dev", name: "Ben Cohen" });
    expect(session.errorMessage.value).toBeNull();
    expect(session.isLoading.value).toBe(false);
    expect(api.requests.map((request) => request.path)).toEqual(["/api/session"]);
  });

  it("quotes the server's message when the session cannot load", async () => {
    loadWith({
      "GET /api/session": {
        status: 500,
        body: { code: "UNDECLARED", message: "The service is having a moment." },
      },
    });
    const session = useRivetSession();
    await session.load();

    expect(session.user.value).toBeNull();
    expect(session.capabilities.value).toBeNull();
    expect(session.errorMessage.value).toBe("The service is having a moment.");
  });

  it("treats a bodyless 401 as not signed in", async () => {
    loadWith({ "GET /api/session": { status: 401, body: null } });
    const session = useRivetSession();
    await session.load();

    expect(session.user.value).toBeNull();
    expect(session.capabilities.value).toBeNull();
    expect(session.errorMessage.value).toContain("not signed in");
  });

  it("reports when the service cannot be reached at all", async () => {
    const failingFetch: RivetFetch = async () => {
      throw new Error("connection refused");
    };
    configureRivet({ baseUrl: "http://api.test", fetch: failingFetch });
    const session = useRivetSession();
    await session.load();

    expect(session.errorMessage.value).toBe(
      "Can't reach the booking service. Check it's running, then try again.",
    );
    expect(session.isLoading.value).toBe(false);
  });

  it("switching users persists the choice and reloads the session", async () => {
    const api = loadWith({ "GET /api/session": { status: 200, body: amaraSession } });
    const session = useRivetSession();
    await session.switchTo("amara@roombooking.dev");

    expect(window.localStorage.getItem("roombooking:acting-as")).toBe("amara@roombooking.dev");
    expect(session.actingAs.value).toEqual({
      email: "amara@roombooking.dev",
      name: "Amara Okafor",
    });
    expect(session.user.value?.role).toBe("staff");
    expect(session.capabilities.value).toEqual({ canManageRooms: true, canBookRooms: false });
    expect(api.requests.map((request) => request.path)).toEqual(["/api/session"]);
  });

  it("switching to the current user changes nothing", async () => {
    const api = loadWith({ "GET /api/session": { status: 200, body: benSession } });
    const session = useRivetSession();
    await session.switchTo("ben@roombooking.dev");

    expect(api.requests).toEqual([]);
  });
});
