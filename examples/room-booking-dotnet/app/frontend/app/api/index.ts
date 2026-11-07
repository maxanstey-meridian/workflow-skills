import openapiFetch, { type Client } from "openapi-fetch";
import type { components, paths } from "./generated/schema";

// The hand-owned facade over the Rivet-generated client. The UI imports the
// client and DTO types from here and never constructs openapi-fetch clients.
export type { components, paths } from "./generated/schema";

export type Api = Client<paths>;

export const createClient = (): Api => openapiFetch<paths>();

export const client: Api = createClient();

type TokenProvider = () => string | undefined;

export interface RivetConfig {
  readonly baseUrl: string;
  /** Supplies the development identity token (the seeded user id). */
  readonly tokenProvider?: TokenProvider;
}

export const configureRivet = (config: RivetConfig): void => {
  const tokenProvider = config.tokenProvider ?? (() => undefined);
  client.use({
    onRequest({ request }) {
      const token = tokenProvider();
      if (token !== undefined) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
      return request;
    },
  });
};

export type RoomView = components["schemas"]["RoomView"];
export type RoomsResponse = components["schemas"]["RoomsResponse"];
export type RoomAvailabilityView = components["schemas"]["RoomAvailabilityView"];
export type AvailabilityResponse = components["schemas"]["AvailabilityResponse"];
export type BookingView = components["schemas"]["BookingView"];
export type BookingsResponse = components["schemas"]["BookingsResponse"];
export type ErrorResponse = components["schemas"]["ErrorResponse"];
export type UserView = components["schemas"]["UserView"];
export type UsersResponse = components["schemas"]["UsersResponse"];
export type BookingStatusWire = components["schemas"]["BookingStatusWire"];
export type BookingActionWire = components["schemas"]["BookingActionWire"];
export type UserRoleWire = components["schemas"]["UserRoleWire"];

export type { ErrorResponse as ApiError };

/** The declared failure shape from every endpoint. */
export interface ApiFailure {
  readonly status: number;
  readonly body: ErrorResponse | undefined;
}

export type ApiOutcome<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly failure: ApiFailure };

/**
 * Inspect the fetch result exactly as the contract declares: the error
 * channel for non-2xx, the response status as the fallback, never a truthiness
 * check on data.
 */
export function unwrap<T>(result: {
  data?: T;
  error?: ErrorResponse;
  response: Response;
}): ApiOutcome<T> {
  if (result.response.ok) {
    if (result.data !== undefined) {
      return { ok: true, data: result.data };
    }

    // Every declared success in this contract carries a body; an empty one
    // fails the call rather than pretending it succeeded.
    return { ok: false, failure: { status: result.response.status, body: undefined } };
  }

  return {
    ok: false,
    failure: {
      status: result.response.status,
      body: result.error,
    },
  };
}
