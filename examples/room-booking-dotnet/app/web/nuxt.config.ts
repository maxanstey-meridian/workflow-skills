export default defineNuxtConfig({
  ssr: false,
  modules: ["@nuxt/ui", "@nuxt/eslint"],
  css: ["~/assets/css/main.css"],
  devtools: { enabled: false },
  compatibilityDate: "2026-11-24",
});
