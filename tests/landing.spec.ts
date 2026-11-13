import { expect, test } from "@playwright/test";

test("a signed-out visitor can see the Pawprint introduction", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Find a pet to love." })).toBeVisible();
  await expect(page.getByText("Discover pets and save your favorites in one place.")).toBeVisible();
});
