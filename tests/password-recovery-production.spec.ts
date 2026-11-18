import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

test("production disables recovery even with local settings and preserves normal authentication", async ({ page, request }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveCount(0);
  for (const path of ["/forgot-password", "/reset-password"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
  for (const action of ["request-password-reset", "validate-reset-token", "reset-password"]) {
    const data = { email: "nobody@example.test", token: "a".repeat(64), newPassword: "new-password-123" };
    expect((await request.post(`/api/auth/${action}`, { headers: { Origin: "http://127.0.0.1:3200" }, data })).status()).toBe(404);
    expect((await request.post(`http://127.0.0.1:3201/api/auth/${action}`, {
      headers: { Origin: "http://127.0.0.1:3200" }, data,
    })).status()).toBe(404);
  }
  expect((await request.get("http://127.0.0.1:3201/api/auth/reset-password/unused?callbackURL=http://127.0.0.1:3200")).status()).toBe(404);
  const email = `production-${randomUUID()}@example.test`;
  const data = { name: "Ana", email, password: "local-test-password-123" };
  expect((await request.post("/api/auth/sign-up", { headers: { Origin: "http://127.0.0.1:3200" }, data })).status()).toBe(204);
  expect((await request.post("/api/auth/sign-in", { headers: { Origin: "http://127.0.0.1:3200" }, data })).status()).toBe(204);
});
