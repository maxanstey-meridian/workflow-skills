## Composables

Composables are the framework-rich layer.

They may own:

- `ref` / `reactive` / `computed` / `watch`
- VueUse
- Pinia when appropriate
- generated Rivet client calls
- side effects
- loading flags
- local UI orchestration

Composables should:

- inject a port with `injectX` when they depend on a provided capability
- keep pure logic out of themselves where feasible
- expose a clean capability-shaped surface

Composables should not:

- grow into god-objects
- hide large amounts of pure business logic

If a composable gets too large, pull pure logic down into `logic/`.

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
