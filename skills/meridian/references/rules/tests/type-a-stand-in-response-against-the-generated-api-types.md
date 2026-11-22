## Type a stand-in response against the generated API types

**Default:** Type stand-in API responses against generated API types (`satisfies components["schemas"]["…"]` or a typed fixture helper) so API changes break tests at compile time.

**When:** Frontend component/page tests fulfilling requests (Playwright `route.fulfill`, mocked client results); end-to-end journeys never intercept requests.

Bad: `route.fulfill({ json: { id: 1, nmae: "A" } })`
Good: `route.fulfill({ json: { id: 1, name: "A" } satisfies components["schemas"]["FormDto"] })`
