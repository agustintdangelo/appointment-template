import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Create a fresh sqlite database for the test run by applying all migrations,
 * then remove it afterwards. Mirrors the production schema (including driver
 * adapters) without touching the developer's dev.db.
 */
const TEST_DATABASE_URL = "file:./prisma/test.db";
const testDbPath = fileURLToPath(new URL("../prisma/test.db", import.meta.url));

export async function setup() {
  rmSync(testDbPath, { force: true });

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
    },
  });
}

export async function teardown() {
  rmSync(testDbPath, { force: true });
}
