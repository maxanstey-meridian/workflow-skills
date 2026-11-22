## Inject collaborators instead of passing an options bag

**Default:** Inject runtime collaborators via their ports; pass only identity and per-instance config as arguments.

**When:** Vue and Nuxt composables.

Bad: `useFormEffects({ sections, discovery, auth })` assembled by the page.
Good: `useFormEffects(formId)` calling `injectSections()` and `injectDiscovery()` itself.
