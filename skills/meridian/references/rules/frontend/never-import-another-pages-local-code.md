## Never import another page's local code

**Default:** A page or layout subtree never imports from another page's local folders (`components/`, `composables/`, `logic/`, `ports/`, `adapters/`).

**When:** Nuxt pages and layouts.

Bad: `import { getInitials } from "~/pages/index/logic/auth-card"` in a layout component.
Good: the function is promoted to a feature and imported from there.
