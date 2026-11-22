## Do not hide composition in global setup

**Default:** Never wire page-scoped composables or ports in the app shell (`app.vue`); put composition there only for genuinely app-wide capabilities.

**When:** Vue and Nuxt frontends.

Bad: `provideFormDraft(useFormDraft(id))` in `app.vue` for state used by one page.
Good: The same line in that page.
