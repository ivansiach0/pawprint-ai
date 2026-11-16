import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("a visitor can register and return to Discover with the same account", async ({ page, browser }) => {
  const email = `pawprint-${randomUUID()}@example.test`;
  const password = "local-test-password-123";

  await page.goto("/discover");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Ana");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();

  const freshPage = await browser.newPage();
  try {
    await freshPage.goto(new URL("/sign-in", page.url()).href);
    await freshPage.getByLabel("Email").fill(email);
    await freshPage.getByLabel("Password").fill(password);
    await freshPage.getByRole("button", { name: "Sign in" }).click();
    await expect(freshPage).toHaveURL(/\/discover$/);
    await expect(freshPage.getByRole("heading", { name: "Discover" })).toBeVisible();
  } finally {
    await freshPage.close();
  }
});

test("Express rejects Discover requests without a session", async ({ request }) => {
  const response = await request.get("http://127.0.0.1:3101/api/discover");
  expect(response.status()).toBe(401);
});
