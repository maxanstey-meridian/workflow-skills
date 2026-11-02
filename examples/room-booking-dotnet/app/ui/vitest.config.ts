import { defineVitestProject } from "@nuxt/test-utils/config";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The unit project has no Nuxt runtime; it still imports app source through
  // the same "~" alias the Nuxt project resolves.
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/**/*.spec.ts"],
          exclude: ["**/node_modules/**", "tests/pages/*.spec.ts"],
          environment: "happy-dom",
          // Times render in Europe/London everywhere (the booking zone), so the
          // pure formatting tests pin that zone for determinism.
          env: { TZ: "Europe/London" },
        },
      },
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["tests/pages/*.spec.ts"],
          environment: "nuxt",
          env: { TZ: "Europe/London" },
        },
      }),
    ],
  },
});
