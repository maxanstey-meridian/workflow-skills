## Colocate page code with its page

**Default:** Code used by one page lives in that page's folder, under `components/`, `composables/`, `logic/`, `ports/`, and `adapters/`.

**When:** Nuxt pages. For the root page, the folder is `app/pages/index/` beside `index.vue`.

Bad: `app/composables/useFormsPage.ts`, used only by `pages/forms/index.vue`.
Good: `app/pages/forms/composables/useFormsPage.ts`.
