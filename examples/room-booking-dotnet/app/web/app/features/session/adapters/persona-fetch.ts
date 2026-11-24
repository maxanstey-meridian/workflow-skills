import type { RivetFetch } from "@cowork/contracts";

export const personaHeaderName = "X-Dev-User";

/**
 * Wraps the platform fetch so every request carries the current persona as
 * the dev authentication header. The header value is read per request, so a
 * persona switch applies to everything sent afterwards.
 */
export const createPersonaFetch = (
  getDevUser: () => string,
  send: RivetFetch = globalThis.fetch,
): RivetFetch => {
  return async (input: Request) => {
    const headers = new Headers(input.headers);
    headers.set(personaHeaderName, getDevUser());
    return send(new Request(input, { headers }));
  };
};
