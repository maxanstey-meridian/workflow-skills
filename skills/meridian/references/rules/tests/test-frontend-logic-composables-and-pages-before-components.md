## Test frontend logic, composables, and pages before components

**Default:** On the frontend, test pure `logic/` directly, composables where state or orchestration matters, and pages where wiring matters, rather than making presentational components the main test surface.

**When:** Vue and Nuxt frontends.

Bad: a mount test for every leaf component, each with mocked props and emits.
Good: a `logic/` unit test, a composable test, and one page test that checks the wiring.
