// Vue/Nuxt layer only; oxlint handles the rest.
// @nuxt/eslint writes ./.nuxt/eslint.config.mjs during `nuxt prepare`.
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  ignores: [".nuxt/**", ".output/**", "dist/**", "node_modules/**"],
});
