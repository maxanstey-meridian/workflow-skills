## Import a feature only through its index

**Default:** Import a feature only through `app/features/<feature>/index.ts`, never its internal files.

**When:** Nuxt frontends with `app/features/` (an arbitrary `index.ts` barrel elsewhere is not a feature entry point).

Bad: `import { injectAuth } from "~/features/auth/ports/auth"`.
Good: `import { injectAuth, getInitials } from "~/features/auth"`.
