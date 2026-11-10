## Type a stand-in response against the generated API types

**Default:** Type a stand-in API response against the generated API types, with `satisfies components["schemas"]["…"]` or a typed fixture helper, so a change to the API breaks the test at compile time.

**When:** A frontend component or page test that fulfils a request (a Playwright `route.fulfill` body, a mocked client result). An end-to-end journey has no stand-in responses, since it never intercepts requests.

Bad: `route.fulfill({ json: { id: 1, nmae: "A" } })`
Good: `route.fulfill({ json: { id: 1, name: "A" } satisfies components["schemas"]["FormDto"] })`
