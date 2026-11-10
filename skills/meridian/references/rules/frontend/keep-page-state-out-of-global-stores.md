## Keep page state out of global stores

**Default:** Do not use a global store as the default home for state, or to carry unrelated concerns between components; state that one page or layout owns lives in a composable at that root.

**When:** Vue and Nuxt frontends (Pinia or any global store).

Bad: a Pinia store for the form editor's draft, used by one page.
Good: `provideFormDraft(useFormDraft(id))` in that page.
