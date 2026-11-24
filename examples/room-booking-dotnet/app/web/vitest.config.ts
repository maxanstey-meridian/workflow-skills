import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: [
      {
        // The tests never boot the Nuxt app; state composables get an
        // in-memory useState instead.
        find: /^nuxt\/app$/,
        replacement: fileURLToPath(new URL("./tests/support/nuxt-app.ts", import.meta.url)),
      },
      { find: "~", replacement: fileURLToPath(new URL("./app", import.meta.url)) },
    ],
  },
  test: {
    environment: "happy-dom",
    env: {
      TZ: "UTC",
    },
    include: ["tests/**/*.spec.ts"],
  },
});
