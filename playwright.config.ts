import { defineConfig, devices } from "@playwright/test";

const webOrigin = "http://127.0.0.1:3100";
const apiOrigin = "http://127.0.0.1:3101";
const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.");
}

export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/password-recovery-production.spec.ts",
  use: { baseURL: webOrigin, screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "node --import tsx --import ./tests/helpers/expired-clock.ts server/index.ts",
      url: "http://127.0.0.1:3102/health",
      env: {
        NODE_ENV: "test", DATABASE_URL: databaseUrl, PAWPRINT_LOCAL_RECOVERY: "true",
        BETTER_AUTH_URL: webOrigin, BETTER_AUTH_SECRET: "pawprint-playwright-local-test-secret",
        MAILPIT_ORIGIN: process.env.TEST_MAILPIT_ORIGIN ?? "http://127.0.0.1:8026",
        API_HOST: "127.0.0.1", PORT: "3102",
      },
    },
    {
      command: "npm run db:migrate && npm run db:seed && npm run dev:api",
      url: `${apiOrigin}/health`,
      env: {
        DATABASE_URL: databaseUrl,
        PAWPRINT_LOCAL_RECOVERY: "true",
        MAILPIT_ORIGIN: process.env.TEST_MAILPIT_ORIGIN ?? "http://127.0.0.1:8026",
        BETTER_AUTH_URL: webOrigin,
        BETTER_AUTH_SECRET: "pawprint-playwright-local-test-secret",
        API_HOST: "127.0.0.1",
        PORT: "3101",
      },
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: webOrigin,
      env: { PAWPRINT_API_ORIGIN: apiOrigin, BETTER_AUTH_URL: webOrigin, PAWPRINT_LOCAL_RECOVERY: "true" },
    },
  ],
});
