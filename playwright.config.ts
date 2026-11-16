import { defineConfig, devices } from "@playwright/test";

const webOrigin = "http://127.0.0.1:3100";
const apiOrigin = "http://127.0.0.1:3101";
const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.");
}

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: webOrigin },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "npm run db:migrate && npm run db:seed && npm run dev:api",
      url: `${apiOrigin}/health`,
      env: {
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_URL: webOrigin,
        BETTER_AUTH_SECRET: "pawprint-playwright-local-test-secret",
        API_HOST: "127.0.0.1",
        PORT: "3101",
      },
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: webOrigin,
      env: { PAWPRINT_API_ORIGIN: apiOrigin, BETTER_AUTH_URL: webOrigin },
    },
  ],
});
