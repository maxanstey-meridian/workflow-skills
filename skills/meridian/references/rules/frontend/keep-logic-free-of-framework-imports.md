## Keep logic free of framework imports

**Default:** Files in `logic/` are pure TypeScript: no imports from `vue`, `nuxt`, `#imports`, or any framework package.

**When:** `logic/` folders in a Vue or Nuxt frontend. Components may import `logic/` directly.

Bad: `import { computed } from "vue"` in `logic/section-state.ts`.
Good: a plain function in `logic/section-state.ts` that takes and returns values.
