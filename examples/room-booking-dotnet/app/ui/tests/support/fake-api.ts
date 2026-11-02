import type { RivetFetch } from "@roombooking/contracts";

/**
 * A typed fake at the transport boundary: the real openapi-fetch client runs,
 * only `fetch` is faked. Bodies below the port are typed with `satisfies
 * components["schemas"]["…"]` in the tests, so a contract change breaks the
 * test at compile time.
 *
 * A `null` body is sent without a content type — the shape the API's bodyless
 * statuses actually have.
 */
export interface FakeRoute {
  status: number;
  body: unknown;
}

export interface RecordedRequest {
  method: string;
  path: string;
  headers: Headers;
}

export const createFakeApi = (routes: Record<string, FakeRoute>) => {
  const requests: RecordedRequest[] = [];

  const fetch: RivetFetch = async (input) => {
    const url = new URL(input.url);
    requests.push({ method: input.method, path: url.pathname, headers: input.headers });
    const route = routes[`${input.method} ${url.pathname}`];
    if (route === undefined) {
      return new Response(
        JSON.stringify({
          code: "NO_FAKE_ROUTE",
          message: `No fake route for ${input.method} ${url.pathname}.`,
        }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }
    if (route.body === null) {
      return new Response(null, { status: route.status });
    }
    return new Response(JSON.stringify(route.body), {
      status: route.status,
      headers: { "content-type": "application/json" },
    });
  };

  return { requests, fetch };
};
