## Call useState only inside a composable

**Default:** Call Nuxt `useState(` only inside `composables/`; the composable owns the key, and all other layers (components, pages, plugins, logic, adapters) call the composable, never the string key.

**When:** Nuxt frontends (no `state/` directory; state lives in composables).

Bad: `useState("app-booted")` in both a component and a plugin.
Good: `export const useAppBooted = () => useState("app-booted", () => false)`, called in both.
