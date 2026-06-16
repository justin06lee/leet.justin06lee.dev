import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // In-memory libSQL DB for integration tests — fresh per test file.
    // db.ts reads these at import time.
    env: {
      TURSO_DB_URL: ":memory:",
      TURSO_DB_AUTH_TOKEN: "",
      OWNER_GITHUB_LOGIN: "justin06lee",
    },
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
