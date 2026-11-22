## Give a composable one capability

**Default:** A composable may hold reactive state, client calls, side effects, and local UI orchestration, but returns a surface for one capability rather than several.

**When:** Vue and Nuxt composables (may depend on `logic/`, `ports/`, generated clients, Pinia, and VueUse).

Bad: `usePage()` returning auth, recordings, toasts, and form state.
Good: `useRecordings()` and `useFormDraft()`, each with one surface.
