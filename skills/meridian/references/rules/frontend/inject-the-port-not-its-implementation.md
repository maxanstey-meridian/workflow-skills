## Inject the port, not its implementation

**Default:** Depend on a provided capability by importing `injectX` from `ports/`, never the implementation composable or adapter.

**When:** Components and composables in Vue and Nuxt frontends.

Bad: `import { useRivetAuth } from "../composables/useRivetAuth"` in a component.
Good: `import { injectAuth } from "../ports/auth"`.
