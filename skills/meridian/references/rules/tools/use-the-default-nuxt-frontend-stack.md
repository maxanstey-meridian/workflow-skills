## Use the default Nuxt frontend stack

**Tooling:** For a frontend use Nuxt 4 with Vue 3 and TypeScript, `vue-tsc` to typecheck, `@nuxt/ui` for components, `@vueuse/core` for utilities, `vitest` with `@vue/test-utils` and `happy-dom` for tests, and `playwright` for end-to-end tests where they are warranted.

**When:** A new frontend.

Bad: a new app on Vite with hand-picked component and test libraries.
Good: a new Nuxt 4 app with `@nuxt/ui`, `@vueuse/core`, `vitest`, and `vue-tsc`.
