## Import across page layers in one direction

**Default:** Imports between a page's folders point one way: `logic/` imports none of the others, `ports/` imports only `logic/`, `adapters/` imports only `logic/` and `ports/`, and a component never imports an adapter.

**When:** The `logic/`, `ports/`, `adapters/`, `composables/`, and `components/` folders of a Vue or Nuxt frontend. Composables and composition roots (the app shell, a layout, or a page) may import any of them, and a port file may import the `useProvideInject` helper.

Bad: `import { useSections } from "../composables/useSections"` in `logic/section-state.ts`.
Good: `logic/section-state.ts` exports a plain function, and `composables/useSections.ts` imports it.
