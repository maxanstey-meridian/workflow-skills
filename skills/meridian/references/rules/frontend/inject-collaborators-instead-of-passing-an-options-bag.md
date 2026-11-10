## Inject collaborators instead of passing an options bag

**Default:** A composable gets its runtime collaborators by injecting their ports (the typed capabilities a root provides); its arguments are only identity and real per-instance configuration.

**When:** Vue and Nuxt composables.

Bad: `useFormEffects({ sections, discovery, auth })`, assembled by the page.
Good: `useFormEffects(formId)`, which calls `injectSections()` and `injectDiscovery()` itself.
