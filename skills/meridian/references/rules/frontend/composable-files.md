## Composable Files

### File naming

Composable files are camelCase, matching the exported function: `useAuth.ts`
exports `useAuth`. Older code may differ; fix it when you touch it.

### Framework state (`useState`)

Nuxt `useState()` is blessed — **behind composables only**. `useState(` may
appear only inside `composables/` files; the composable owns the key and exposes
a named capability:

```ts
// composables/useAppBooted.ts
export const useAppBooted = () => useState("app-booted", () => false);
```

Every other layer — components, pages, plugins, logic, adapters — consumes the
owning composable (`useAppBooted()`), never the string key. Two files sharing a
bare key is provenance-invisible coupling; the composable makes the owner
greppable. There is no `state/` directory: composables are the state home in
this taxonomy.
