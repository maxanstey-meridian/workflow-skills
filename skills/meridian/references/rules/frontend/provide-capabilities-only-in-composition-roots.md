## Provide capabilities only in composition roots

**Law:** Only composition roots (`app.vue`, layouts, or pages) call `provideX`; components and composables only call `injectX`.

**When:** Vue/Nuxt frontends — roots map to lifetimes (`app.vue` = app, layouts = session, pages = route), keeping wiring searchable; feature folders never provide themselves. Tests under top-level `tests/`, `test/`, or `e2e/` may call `provideX` as a test root.

Bad: `provideAuth(useRivetAuth())` inside `app-sidebar.vue`.
Good: The same line in `layouts/default.vue`, with the sidebar calling `injectAuth()`.
