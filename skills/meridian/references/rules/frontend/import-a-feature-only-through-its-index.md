## Import a feature only through its index

**Default:** Consumers import a feature (a product capability several pages or layouts use) only through its public entry point, `app/features/<feature>/index.ts`, never its internal files.

**When:** Nuxt frontends with `app/features/`. Another `index.ts` barrel is not a feature's public entry point by its file name alone.

Bad: `import { injectAuth } from "~/features/auth/ports/auth"`.
Good: `import { injectAuth, getInitials } from "~/features/auth"`.
