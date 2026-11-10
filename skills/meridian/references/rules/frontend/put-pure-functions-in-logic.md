## Put pure functions in logic

**Default:** Anything that can be a pure function lives in `logic/`: transforms, immutable data shaping, mapping a server value to a label, colour, icon, or order, and checks on client state with their limits taken from the DTO.

**When:** Vue and Nuxt frontends; applies to code in composables, components, and pages.

Bad: a `statusLabel` switch inside a component's `<script setup>`.
Good: `logic/status.ts` exporting `statusLabel`, which the component imports.
