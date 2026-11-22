## Keep adapters free of Vue and presentation state

**Default:** An adapter translates between a port and HTTP, a generated client, storage, or a platform API; it holds no presentation state, and a pure adapter imports nothing from Vue or Nuxt.

**When:** `adapters/` in Vue/Nuxt frontends. Keep reactive `ref`/`watch`/lifecycle wiring in a composable and protocol translation in the adapter; pure adapters depend only on `logic/` and `ports/`.

Bad: An adapter holding `const isLoading = ref(false)`.
Good:
```ts
export const sectionStateAdapter: SectionState = {
  createSection,
  removeSection: removeSectionById,
  reorderSections,
};
```
