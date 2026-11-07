## Default Recommendation

Treat **`app.vue`, layouts, and pages** as the only composition roots.

This is deliberately stricter than generic provide/inject advice. Vue cannot
navigate from `injectX()` to the runtime provider. Restricting every `provideX()`
to three Nuxt shell locations makes the wiring searchable and predictable.

Do not default to:

- global stores for everything
- component-local business logic
- fake API service wrappers around generated clients
- `app/features/...` for code that is genuinely page-local

The stable boundary is the **page/layout-owned feature**, not the composable and
not the component.
