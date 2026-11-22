## Keep composition roots free of business logic

**Default:** A composition root (`app.vue`, layout, or page) creates composables, provides ports, and composes components — no business logic or inline pure transforms.

**When:** `app.vue`, layouts, and pages in Vue/Nuxt frontends.

Bad: A page's `<script setup>` sorting and grouping rows inline.
Good: The page calling `groupRows` from `logic/`.
