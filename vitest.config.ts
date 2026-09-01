import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// The financial domain tests run as plain TypeScript without a browser.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
