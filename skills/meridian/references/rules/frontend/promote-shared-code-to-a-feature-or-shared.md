## Promote shared code to a feature or shared

**Default:** When more than one subtree needs a product capability, its port and pure logic move to `app/features/<feature>/` (a feature is a product capability several pages or layouts use), and code no feature owns moves to `app/shared/`; an implementation only one root constructs stays beside that root, and one several roots construct may live in the feature.

**When:** Nuxt frontends. A feature folder may hold `logic/`, `ports/`, `adapters/`, implementation composables, and public types.

Bad: `useRivetAuth`, which only the default layout constructs, moved to `app/features/auth/` with the `Auth` port.
Good: the `Auth` port moved to `app/features/auth/ports/auth.ts`, with `useRivetAuth` left under `app/layouts/default/composables/`.
