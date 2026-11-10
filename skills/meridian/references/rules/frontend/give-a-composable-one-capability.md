## Give a composable one capability

**Default:** A composable may hold reactive state, client calls, side effects, and local UI orchestration, and it returns a surface for one capability (something the code needs done for it) rather than growing to cover several.

**When:** Vue and Nuxt composables. A composable may depend on `logic/`, `ports/`, generated clients, Pinia, and VueUse.

Bad: `usePage()` returning auth, recordings, toasts, and form state.
Good: `useRecordings()` and `useFormDraft()`, each with one surface.
