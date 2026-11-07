// Nuxt config for the room-booking SPA. The API is a separate .NET process,
// so the app is a single-page client: no server-side rendering, no payloads.
export default defineNuxtConfig({
  modules: ["@nuxt/ui", "@nuxt/eslint"],
  ssr: false,
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      // The .NET API host; override with NUXT_PUBLIC_API_BASE in deployment.
      apiBase: "http://localhost:5000",
    },
  },
  eslint: {
    config: {
      stylistic: false,
    },
  },
  css: ["~/assets/css/main.css"],
});
