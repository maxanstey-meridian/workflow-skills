## Inject the port, not its implementation

**Default:** A component or composable that depends on a provided capability imports `injectX` from `ports/`, not the implementation composable or the adapter (the implementation of a port).

**When:** Components and composables in a Vue or Nuxt frontend.

Bad: `import { useRivetAuth } from "../composables/useRivetAuth"` in a component.
Good: `import { injectAuth } from "../ports/auth"`.
