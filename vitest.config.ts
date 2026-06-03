import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    globalSetup: "./tests/global-setup.ts",
    // Run against a throwaway sqlite database so tests never touch dev.db.
    env: {
      DATABASE_URL: "file:./prisma/test.db",
      NODE_ENV: "test",
    },
    // The booking guard relies on a single shared sqlite connection; run test
    // files sequentially so they don't contend on the shared test.db.
    fileParallelism: false,
  },
});
