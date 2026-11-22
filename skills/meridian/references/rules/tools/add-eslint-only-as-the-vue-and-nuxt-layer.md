## Add eslint only as the Vue and Nuxt layer

**Tooling:** Use `eslint` with `@nuxt/eslint` only for Vue/Nuxt rules `oxlint` does not cover; omit eslint completely when an app has no `.vue` files.

**When:** Any TypeScript repo.

Bad: An eslint config in an API package with no `.vue` files.
Good: No eslint in the API package; in the UI app, only wrap `withNuxt(...)`:
```js
// apps/ui/eslint.config.mjs — Vue/Nuxt layer only; oxlint handles the rest.
// @nuxt/eslint writes ./.nuxt/eslint.config.mjs during `nuxt prepare`.
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  name: "project/vue-rules",
  rules: { "vue/multi-word-component-names": "off" },
}).append({ ignores: [".nuxt/**", ".output/**", "dist/**"] });
```
