export default defineNuxtConfig({
  ssr: false,
  modules: ["@nuxt/ui"],
  devtools: { enabled: false },
  compatibilityDate: "2026-11-01",
  nitro: {
    devProxy: {
      "/api": {
        target: "http://localhost:5213",
        changeOrigin: true,
      },
    },
  },
});
