import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// A standalone config so tests do not load the Cloudflare/vinext build plugins
// from vite.config.ts. The money logic under test is plain TypeScript.
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
