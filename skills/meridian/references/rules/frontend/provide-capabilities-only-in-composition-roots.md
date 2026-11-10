## Provide capabilities only in composition roots

**Law:** Only composition roots (the app shell, a layout, or a page) call `provideX` to provide capabilities (typed things the code needs done for it); components and composables only inject them with `injectX`.

**When:** Vue and Nuxt frontends, where Vue cannot trace an inject back to its provider, so a few known places keep the wiring searchable. In Nuxt the roots are `app.vue` (application lifetime), layouts (session lifetime across pages), and pages (route lifetime); `provideX` is called nowhere else, and a feature folder never provides itself. A test may call `provideX` to stand in for the root, from a spec or test file under the top-level `tests/`, `test/`, or `e2e/` tree of the frontend or its package.

Bad: `provideAuth(useRivetAuth())` inside `app-sidebar.vue`.
Good: the same line in `layouts/default.vue`, with the sidebar calling `injectAuth()`.
