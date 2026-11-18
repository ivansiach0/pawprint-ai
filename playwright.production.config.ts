import { defineConfig, devices } from "@playwright/test";

const webOrigin = "http://127.0.0.1:3200";
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.");
const shared = {
  NODE_ENV: "production",
  RENDER: "true",
  PAWPRINT_LOCAL_RECOVERY: "true",
  MAILPIT_ORIGIN: process.env.TEST_MAILPIT_ORIGIN ?? "http://127.0.0.1:8026",
  BETTER_AUTH_URL: webOrigin,
};

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/password-recovery-production.spec.ts",
  use: { baseURL: webOrigin, screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "npm run db:migrate && npm run db:seed && npm run start:api",
      url: "http://127.0.0.1:3201/health",
      env: {
        ...shared, DATABASE_URL: databaseUrl,
        BETTER_AUTH_SECRET: "pawprint-playwright-local-test-secret", API_HOST: "127.0.0.1", PORT: "3201",
      },
    },
    {
      command: "npm start -- --hostname 127.0.0.1 --port 3200",
      url: webOrigin,
      env: { ...shared, PAWPRINT_API_ORIGIN: "http://127.0.0.1:3201" },
    },
  ],
});
