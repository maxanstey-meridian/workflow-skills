## Call useState only inside a composable

**Default:** Nuxt `useState(` appears only inside `composables/` files; the composable owns the key, and every other layer (components, pages, plugins, logic, adapters) calls the composable, never the string key.

**When:** Nuxt frontends. There is no `state/` directory: composables are where state lives.

Bad: `useState("app-booted")` in a component and again in a plugin.
Good: `export const useAppBooted = () => useState("app-booted", () => false)`, with `useAppBooted()` called in both.
