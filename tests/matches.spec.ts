import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function register(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Ana");
  await page.getByLabel("Email").fill(`pawprint-${randomUUID()}@example.test`);
  await page.getByLabel("Password").fill("local-test-password-123");
  const [registration] = await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === "/api/auth/sign-up"),
    page.getByRole("button", { name: "Create account" }).click(),
  ]);
  expect(registration.status()).toBe(204);
  await expect(page).toHaveURL(/\/discover$/);
}

test("pass and save persist without affecting another account", async ({ page, browser }) => {
  await register(page);
  await page.getByRole("link", { name: "Matches", exact: true }).click();
  await expect(page.getByText("No matches yet")).toBeVisible();
  await page.getByRole("link", { name: "Go to Discover" }).click();
  await expect(page.getByRole("heading", { name: "Luna" })).toBeVisible();
  const pass = page.getByRole("button", { name: "Pass" });
  await expect(pass).toBeVisible();
  await pass.click();
  await expect(page.getByRole("heading", { name: "Milo" })).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: "Bella" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Bella" })).toBeVisible();
  await page.getByRole("link", { name: "Matches", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Milo" })).toHaveCount(1);
  await expect(page.getByRole("img", { name: "Milo" })).toBeVisible();
  await expect(page.getByText("Dog · 2 years old")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Luna" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Milo" })).toHaveCount(1);

  const otherAccount = await browser.newContext({ baseURL: new URL("/", page.url()).href });
  try {
    const otherPage = await otherAccount.newPage();
    await otherPage.goto("/matches");
    await expect(otherPage).toHaveURL(/\/sign-in$/);
    await register(otherPage);
    await expect(otherPage.getByRole("heading", { name: "Luna" })).toBeVisible();
    await otherPage.getByRole("link", { name: "Matches", exact: true }).click();
    await expect(otherPage.getByText("No matches yet")).toBeVisible();
    await expect(otherPage.getByRole("heading", { name: "Milo" })).toHaveCount(0);
    await otherPage.getByRole("link", { name: "Go to Discover" }).click();
    await expect(otherPage.getByRole("heading", { name: "Luna" })).toBeVisible();
  } finally {
    await otherAccount.close();
  }
});
