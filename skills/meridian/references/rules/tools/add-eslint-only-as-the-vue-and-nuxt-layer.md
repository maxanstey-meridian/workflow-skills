## Add eslint only as the Vue and Nuxt layer

**Tooling:** Use `eslint` with `@nuxt/eslint` only for the Vue and Nuxt rules `oxlint` does not cover; an app with no `.vue` files carries no eslint at all.

**When:** Every TypeScript repo; an app with `.vue` files carries the `@nuxt/eslint` layer on top of `oxlint`.

Bad: an eslint config in an API package that has no `.vue` files.
Good: no eslint in the API package, and in the UI app a config that only wraps `withNuxt(...)`:
```js
// apps/ui/eslint.config.mjs — eslint is only the Vue/Nuxt layer; oxlint does the rest.
// @nuxt/eslint writes ./.nuxt/eslint.config.mjs during `nuxt prepare`.
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  name: "project/vue-rules",
  rules: { "vue/multi-word-component-names": "off" },
}).append({ ignores: [".nuxt/**", ".output/**", "dist/**"] });
```
