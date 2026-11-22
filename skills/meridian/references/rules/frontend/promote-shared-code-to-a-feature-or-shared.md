## Promote shared code to a feature or shared

**Default:** When multiple subtrees need a product capability, move its port and pure logic to `app/features/<feature>/` (and ownerless code to `app/shared/`); keep single-root implementations beside that root, and move multi-root implementations into the feature.

**When:** Nuxt frontends. Feature folders may hold `logic/`, `ports/`, `adapters/`, implementation composables, and public types.

Bad: Moving `useRivetAuth` (constructed only by the default layout) into `app/features/auth/` with `Auth`.
Good: Moving `Auth` to `app/features/auth/ports/auth.ts` and keeping `useRivetAuth` in `app/layouts/default/composables/`.
