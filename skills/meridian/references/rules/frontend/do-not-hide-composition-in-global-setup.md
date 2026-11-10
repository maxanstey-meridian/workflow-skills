## Do not hide composition in global setup

**Default:** Do not put composition (creating implementation composables and providing ports) in the app shell, which is set up once for every page, unless the capability is genuinely app-wide.

**When:** Vue and Nuxt frontends; in Nuxt the app shell is `app.vue`.

Bad: `provideFormDraft(useFormDraft(id))`, for state one page uses, in `app.vue`.
Good: the same line in that page.
