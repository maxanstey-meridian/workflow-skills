// eslint is only the Vue/Nuxt layer; oxlint does the rest (see tools doctrine).
// @nuxt/eslint writes ./.nuxt/eslint.config.mjs during `nuxt prepare`.
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt({
  name: "roombooking/ui-rules",
  rules: {
    "vue/multi-word-component-names": "off",
  },
}).append({
  ignores: [".nuxt/**", ".output/**", "dist/**", "../packages/contracts/generated/**"],
});
