import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("."),
      // server-only throws outside a React Server Components build.
      "server-only": path("node_modules/server-only/empty.js"),
    },
  },
  test: { include: ["lib/**/*.test.ts"] },
});
