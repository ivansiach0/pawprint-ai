import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";

const api = "http://127.0.0.1:3101";
const origin = "http://127.0.0.1:3100";
const mailpit = process.env.TEST_MAILPIT_ORIGIN ?? "http://127.0.0.1:8026";
const oldPassword = "local-test-password-123";
const newPassword = "new-local-password-456";

async function register(request: APIRequestContext) {
  const email = `recover-${randomUUID()}@example.test`;
  const response = await request.post(`${api}/api/auth/sign-up/email`, {
    headers: { Origin: origin }, data: { name: "Ana", email, password: oldPassword },
  });
  expect(response.ok()).toBeTruthy();
  return email;
}

async function requestLink(request: APIRequestContext, email: string) {
  const response = await request.post(`${api}/api/auth/request-password-reset`, {
    headers: { Origin: origin }, data: { email },
  });
  expect(response.status()).toBe(204);
}

async function resetLink(request: APIRequestContext, email: string) {
  const response = await request.get(`${mailpit}/api/v1/search`, { params: { query: `to:${email}` } });
  expect(response.ok()).toBeTruthy();
  const { messages } = await response.json();
  expect(messages.length).toBeGreaterThan(0);
  const message = await (await request.get(`${mailpit}/api/v1/message/${messages[0].ID}`)).json();
  const link = message.Text.match(/http:\/\/[^\s]+/)?.[0];
  expect(link).toBeTruthy();
  expect(new URL(link).origin).toBe(origin);
  return new URL(link);
}

test("a local reset email changes the password and revokes previous sessions", async ({ request }) => {
  const email = await register(request);
  await requestLink(request, email);
  const link = await resetLink(request, email);
  const reset = await request.post(`${api}/api/auth/reset-password`, {
    headers: { Origin: origin }, data: { token: new URLSearchParams(link.hash.slice(1)).get("token"), newPassword },
  });
  expect(reset.status()).toBe(204);
  expect((await request.get(`${api}/api/discover`)).status()).toBe(401);
  const signIn = (password: string) => request.post(`${api}/api/auth/sign-in/email`, {
    headers: { Origin: origin }, data: { email, password },
  });
  expect((await signIn(oldPassword)).status()).toBe(401);
  expect((await signIn(newPassword)).status()).toBe(200);
});

test("a user recovers through the BFF and retains Matches and Discover progress", async ({ page }) => {
  const email = await register(page.request);
  for (const decision of [{ petId: 1, choice: "save" }, { petId: 2, choice: "pass" }]) {
    expect((await page.request.post(`${api}/api/discover/decisions`, { data: { ...decision, round: 0 } })).status()).toBe(204);
  }
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot password?", exact: true })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists for this email");
  const link = await resetLink(page.request, email);
  await page.goto(link.href);
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill("does-not-match");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Passwords do not match" })).toBeVisible();
  await page.getByLabel("Confirm new password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?reset=success$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bella", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Matches", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Luna", exact: true })).toBeVisible();
});

test("only the newest link works and validation errors do not consume it", async ({ request }) => {
  const email = await register(request);
  await requestLink(request, email);
  const first = await resetLink(request, email);
  const firstToken = new URLSearchParams(first.hash.slice(1)).get("token");
  expect((await request.post(`${api}/api/auth/validate-reset-token`, {
    headers: { Origin: origin }, data: { token: firstToken },
  })).status()).toBe(204);
  await requestLink(request, email);
  const latest = await resetLink(request, email);
  const token = new URLSearchParams(latest.hash.slice(1)).get("token");
  expect(token).not.toBe(firstToken);
  const reset = (data: object) => request.post(`${api}/api/auth/reset-password`, { headers: { Origin: origin }, data });
  expect((await reset({ token: firstToken, newPassword })).status()).toBe(410);
  expect((await reset({ token, newPassword: "short" })).status()).toBe(400);
  expect((await reset({ token, newPassword: "x".repeat(129) })).status()).toBe(400);
  expect((await reset({ token, newPassword })).status()).toBe(204);
  expect((await reset({ token, newPassword: "another-password-789" })).status()).toBe(410);
});

test("requests do not disclose account existence or allow arbitrary redirects", async ({ request }) => {
  const email = await register(request);
  const unknown = `unknown-${randomUUID()}@example.test`;
  await requestLink(request, email);
  await requestLink(request, unknown);
  const search = await request.get(`${mailpit}/api/v1/search`, { params: { query: `to:${unknown}` } });
  expect((await search.json()).messages).toEqual([]);
  expect((await request.post(`${api}/api/auth/request-password-reset`, {
    headers: { Origin: origin }, data: { email, redirectTo: "https://example.com/reset" },
  })).status()).toBe(400);
  expect((await request.post(`${api}/api/auth/request-password-reset`, {
    headers: { Origin: "https://example.com" }, data: { email },
  })).status()).toBe(403);
  expect((await request.post("/api/auth/request-password-reset", { data: { email } })).status()).toBe(403);
});

test("expired links fail after thirty minutes without changing the account", async ({ request }) => {
  const email = await register(request);
  await requestLink(request, email);
  const link = await resetLink(request, email);
  const token = new URLSearchParams(link.hash.slice(1)).get("token");
  const response = await request.post("http://127.0.0.1:3102/api/auth/reset-password", {
    headers: { Origin: origin }, data: { token, newPassword },
  });
  expect(response.status()).toBe(410);
  expect((await request.get(`${api}/api/discover`)).status()).toBe(200);
  expect((await request.post(`${api}/api/auth/sign-in/email`, {
    headers: { Origin: origin }, data: { email, password: oldPassword },
  })).status()).toBe(200);
});

test("a stale open form shows the invalid-link recovery action", async ({ page }) => {
  const email = await register(page.request);
  await requestLink(page.request, email);
  const old = await resetLink(page.request, email);
  await page.goto(old.href);
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await requestLink(page.request, email);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByText("This reset link is invalid or has expired", { exact: true })).toBeFocused();
  await page.getByRole("link", { name: "Request a new link" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});

test("reset revokes every existing session and does not affect another account", async ({ request, playwright }) => {
  const email = await register(request);
  const second = await playwright.request.newContext();
  const other = await playwright.request.newContext();
  try {
    await register(other);
    expect((await second.post(`${api}/api/auth/sign-in/email`, {
      headers: { Origin: origin }, data: { email, password: oldPassword },
    })).status()).toBe(200);
    expect((await second.get(`${api}/api/discover`)).status()).toBe(200);
    await requestLink(request, email);
    const link = await resetLink(request, email);
    expect((await request.post(`${api}/api/auth/reset-password`, {
      headers: { Origin: origin }, data: { token: new URLSearchParams(link.hash.slice(1)).get("token"), newPassword },
    })).status()).toBe(204);
    expect((await request.get(`${api}/api/discover`)).status()).toBe(401);
    expect((await second.get(`${api}/api/discover`)).status()).toBe(401);
    expect((await other.get(`${api}/api/discover`)).status()).toBe(200);
  } finally {
    await second.dispose();
    await other.dispose();
  }
});

test("the latest link can replace an older link in the same reset tab", async ({ page }) => {
  const email = await register(page.request);
  await requestLink(page.request, email);
  const first = await resetLink(page.request, email);
  await page.goto(first.href);
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
  await requestLink(page.request, email);
  const latest = await resetLink(page.request, email);
  await page.goto(latest.href);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Reset password", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/sign-in\?reset=success$/);
});
