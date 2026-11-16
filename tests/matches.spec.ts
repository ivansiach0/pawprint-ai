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

test("Explore again restores passed pets in order and keeps saved pets", async ({ page }) => {
  await register(page);

  // Prepare the end of the round through the authenticated Express API.
  for (let petId = 1; petId <= 67; petId += 1) {
    const response = await page.request.post("http://127.0.0.1:3101/api/discover/decisions", {
      data: { petId, choice: petId === 1 || petId === 3 ? "pass" : "save" },
    });
    expect(response.status()).toBe(204);
  }

  await page.reload();
  await expect(page.getByText("You’ve seen all the pets", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Explore again" }).click();
  await expect(page.getByRole("heading", { name: "Luna" })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bella" })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("You’ve saved all available pets", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Explore again" })).toHaveCount(0);
  await page.getByRole("link", { name: "View Matches" }).click();
  await expect(page).toHaveURL(/\/matches$/);
  for (const name of ["Luna", "Milo", "Bella"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(1);
  }
});

for (const failure of ["before persistence", "after persistence"] as const) {
  test(`retries the same save when the connection fails ${failure}`, async ({ page }) => {
    await register(page);

    let intercepted = false;
    await page.route("**/api/discover/decisions", async (route) => {
      if (intercepted) {
        await route.continue();
        return;
      }
      intercepted = true;
      if (failure === "after persistence") {
        const response = await route.fetch();
        expect(response.status()).toBe(204);
      }
      await route.abort("connectionreset");
    });

    await page.getByRole("button", { name: "Save", exact: true }).click();
    const retry = page.getByRole("button", { name: "Try again" });
    await expect(retry).toBeVisible();
    await expect(page.getByRole("heading", { name: "Luna" })).toBeVisible();
    await retry.click();
    await expect(page.getByRole("heading", { name: "Milo" })).toBeVisible();
    await expect(retry).toHaveCount(0);

    await page.getByRole("link", { name: "Matches", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Luna", exact: true })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Milo", exact: true })).toHaveCount(0);
  });
}
