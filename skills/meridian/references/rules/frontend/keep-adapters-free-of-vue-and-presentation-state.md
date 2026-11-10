## Keep adapters free of Vue and presentation state

**Default:** An adapter (the implementation of a port) translates between a port and HTTP, a generated client, storage, or a platform API; it holds no presentation state, and a pure adapter imports nothing from Vue or Nuxt.

**When:** Files in `adapters/` in a Vue or Nuxt frontend. If building the adapter needs `ref`, `watch`, or lifecycle hooks, that reactive part lives in a composable and the protocol translation stays in the adapter. A pure adapter depends only on `logic/` and `ports/`.

Bad: an adapter that holds `const isLoading = ref(false)`.
Good:
```ts
export const sectionStateAdapter: SectionState = {
  createSection,
  removeSection: removeSectionById,
  reorderSections,
};
```
