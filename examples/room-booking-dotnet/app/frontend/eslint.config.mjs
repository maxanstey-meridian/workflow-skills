// eslint is only the Vue/Nuxt layer; oxlint does the general JS/TS work.
// @nuxt/eslint writes ./.nuxt/eslint.config.mjs during `nuxt prepare`.
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  name: "project/vue-rules",
  // oxfmt owns layout, including void-element style; eslint's copy disagrees.
  rules: { "vue/multi-word-component-names": "off", "vue/html-self-closing": "off" },
}).append({
  ignores: [".nuxt/**", ".output/**", "dist/**", "app/api/generated/**"],
});
