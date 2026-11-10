## Keep composition roots free of business logic

**Default:** A composition root (the app shell, a layout, or a page) creates implementation composables, provides ports, and composes components; it holds no business logic and no inline pure transforms.

**When:** `app.vue`, layouts, and pages in a Vue or Nuxt frontend.

Bad: a page's `<script setup>` that sorts and groups rows inline.
Good: the page calls `groupRows` from `logic/`.
