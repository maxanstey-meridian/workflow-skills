## Import across page layers in one direction

**Default:** Imports between page folders point one way: `logic/` imports none of the others, `ports/` imports only `logic/` (plus `useProvideInject`), `adapters/` imports only `logic/` and `ports/`, and components never import `adapters/`.

**When:** `logic/`, `ports/`, `adapters/`, `composables/`, and `components/` in Vue/Nuxt frontends; composables and composition roots may import any of them.

Bad: `import { useSections } from "../composables/useSections"` in `logic/section-state.ts`.
Good: `logic/section-state.ts` exports a plain function that `composables/useSections.ts` imports.
