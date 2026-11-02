export default defineNuxtConfig({
  compatibilityDate: "2026-10-01",
  ssr: false,
  modules: ["@nuxt/ui", "@nuxt/eslint"],
  devtools: { enabled: false },
  // Fonts are disabled so builds never reach the network; the app uses system fonts.
  ui: { fonts: false },
  css: ["~/assets/css/main.css"],
  typescript: {
    strict: true,
    tsConfig: {
      include: ["../tests/**/*"],
    },
  },
  pages: {
    // Page-local code (components/, composables/, logic/) lives beside each page
    // and must not become routes.
    pattern: ["**/*.{vue,js,ts}", "!**/{components,composables,logic,ports,adapters}/**"],
  },
});
