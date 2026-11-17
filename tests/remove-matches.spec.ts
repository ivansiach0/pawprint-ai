import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";

const api = "http://127.0.0.1:3101";
const origin = "http://127.0.0.1:3100";

async function register(request: APIRequestContext) {
  const response = await request.post(`${api}/api/auth/sign-up/email`, {
    headers: { Origin: origin },
    data: { name: "Ana", email: `remove-${randomUUID()}@example.test`, password: "local-test-password-123" },
  });
  expect(response.ok()).toBeTruthy();
}

async function decide(request: APIRequestContext, petId: number, choice: "pass" | "save", round = 0) {
  const response = await request.post(`${api}/api/discover/decisions`, { data: { petId, choice, round } });
  expect(response.status()).toBe(204);
}

async function matches(request: APIRequestContext) {
  const response = await request.get(`${api}/api/matches`);
  expect(response.status()).toBe(200);
  return (await response.json()).pets as { id: number; name: string; saveVersion: string }[];
}

test("removing a saved pet persists and excludes it until the next round", async ({ request }) => {
  await register(request);
  await decide(request, 1, "save");
  const [saved] = await matches(request);
  const removal = await request.post(`${api}/api/matches/remove`, {
    data: { petId: saved.id, saveVersion: saved.saveVersion },
  });
  expect(removal.status()).toBe(204);
  expect(await matches(request)).toEqual([]);
  const discover = await request.get(`${api}/api/discover`);
  expect((await discover.json()).pet.name).toBe("Milo");
});

test("old removals remain safe across round resets and later saves", async ({ request }) => {
  await register(request);
  for (let petId = 1; petId <= 67; petId += 1) await decide(request, petId, "save");
  const [saved] = await matches(request);
  const data = { petId: saved.id, saveVersion: saved.saveVersion };
  const remove = () => request.post(`${api}/api/matches/remove`, { data });
  expect((await remove()).status()).toBe(204);
  expect((await remove()).status()).toBe(204);
  let discover = await (await request.get(`${api}/api/discover`)).json();
  expect(discover).toMatchObject({ pet: null, canExploreAgain: true, allSaved: false });
  expect((await request.post(`${api}/api/discover/explore-again`, { data: { round: 0 } })).status()).toBe(204);
  expect((await remove()).status()).toBe(204);
  discover = await (await request.get(`${api}/api/discover`)).json();
  expect(discover.pet.name).toBe("Luna");
  await decide(request, 1, "save", 1);
  expect((await remove()).status()).toBe(409);
  expect((await matches(request)).find((pet) => pet.id === 1)?.saveVersion).not.toBe(saved.saveVersion);
});

test("removal enforces authentication, input validation, and account isolation", async ({ request, playwright }) => {
  const other = await playwright.request.newContext();
  try {
    expect((await other.post(`${api}/api/matches/remove`, { data: {} })).status()).toBe(401);
    await register(request);
    await register(other);
    await decide(request, 1, "save");
    await decide(other, 1, "save");
    const [saved] = await matches(request);
    expect((await request.post(`${api}/api/matches/remove`, { data: { petId: 1, saveVersion: "invalid" } })).status()).toBe(400);
    const data = { petId: 1, saveVersion: saved.saveVersion };
    expect((await other.post(`${api}/api/matches/remove`, { data })).status()).toBe(409);
    expect((await request.post(`${api}/api/matches/remove`, { data })).status()).toBe(204);
    expect((await matches(other)).map((pet) => pet.name)).toEqual(["Luna"]);
    expect(await matches(request)).toEqual([]);
  } finally {
    await other.dispose();
  }
});

test("a user can cancel and confirm removal through the BFF", async ({ page }) => {
  await register(page.request);
  await decide(page.request, 1, "save");
  await decide(page.request, 2, "save");
  await page.goto("/matches");
  const luna = page.locator("section").filter({ has: page.getByRole("heading", { name: "Luna", exact: true }) });
  await luna.getByRole("button", { name: "Remove from Matches" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Luna");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(luna.getByRole("button", { name: "Remove from Matches" })).toBeFocused();
  await page.reload();
  await luna.getByRole("button", { name: "Remove from Matches" }).click();
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Luna", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Milo", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Luna", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove from Matches" }).click();
  await dialog.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("No matches yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to Discover" })).toBeVisible();
});

for (const failure of ["before persistence", "after persistence"] as const) {
  test(`removal keeps its card and can retry a failure ${failure}`, async ({ page }) => {
    await register(page.request);
    await decide(page.request, 1, "save");
    await page.goto("/matches");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let intercepted = false;
    await page.route("**/api/matches/remove", async (route) => {
      if (intercepted) return route.continue();
      intercepted = true;
      if (failure === "after persistence") {
        const response = await route.fetch();
        expect(response.status()).toBe(204);
      }
      await gate;
      await route.abort("failed");
    });
    await page.getByRole("button", { name: "Remove from Matches" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).focus();
    await page.keyboard.press("Enter");
    try {
      await expect(page.getByRole("button", { name: "Removing…", exact: true })).toBeDisabled();
      await expect(page.getByRole("region", { name: "Saved pet: Luna" })).toBeFocused();
      await expect(page.getByRole("heading", { name: "Luna", exact: true })).toBeVisible();
    } finally {
      release();
    }
    await expect(page.getByRole("alert").filter({ hasText: "Removal could not be confirmed" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Saved pet: Luna" })).toBeFocused();
    await expect(page.getByRole("heading", { name: "Luna", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("No matches yet")).toBeVisible();
    expect(await matches(page.request)).toEqual([]);
    await page.reload();
    await expect(page.getByText("No matches yet")).toBeVisible();
  });
}

test("an outdated Matches tab cannot remove a later save and can refresh", async ({ page }) => {
  await register(page.request);
  await decide(page.request, 1, "save");
  await page.goto("/matches");
  const [saved] = await matches(page.request);
  expect((await page.request.post(`${api}/api/matches/remove`, {
    data: { petId: 1, saveVersion: saved.saveVersion },
  })).status()).toBe(204);
  for (let id = 2; id <= 67; id += 1) await decide(page.request, id, "pass");
  expect((await page.request.post(`${api}/api/discover/explore-again`, { data: { round: 0 } })).status()).toBe(204);
  await decide(page.request, 1, "save", 1);
  await page.getByRole("button", { name: "Remove from Matches" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Matches has changed" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Saved pet: Luna" })).toBeFocused();
  expect((await matches(page.request)).map((pet) => pet.name)).toEqual(["Luna"]);
  await page.getByRole("button", { name: "Refresh Matches" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Matches has changed" })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove from Matches" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("No matches yet")).toBeVisible();
});

test("concurrent removals and a round transition preserve Discover progress", async ({ request }) => {
  await register(request);
  for (let id = 1; id <= 67; id += 1) await decide(request, id, id === 1 ? "save" : "pass");
  const [saved] = await matches(request);
  const data = { petId: 1, saveVersion: saved.saveVersion };
  const responses = await Promise.all([
    request.post(`${api}/api/matches/remove`, { data }),
    request.post(`${api}/api/discover/explore-again`, { data: { round: 0 } }),
    request.post(`${api}/api/matches/remove`, { data }),
  ]);
  expect(responses.map((response) => response.status())).toEqual([204, 204, 204]);
  expect(await matches(request)).toEqual([]);
  let state = await (await request.get(`${api}/api/discover`)).json();
  expect(state.round).toBe(1);
  // Whichever operation acquired the account lock first determines whether Luna
  // returns in round 1 or remains passed until round 2. Both orders are valid.
  expect([1, 2]).toContain(state.pet.id);
  while (state.pet) {
    await decide(request, state.pet.id, "pass", state.round);
    state = await (await request.get(`${api}/api/discover`)).json();
  }
  expect((await request.post(`${api}/api/discover/explore-again`, { data: { round: 1 } })).status()).toBe(204);
  state = await (await request.get(`${api}/api/discover`)).json();
  expect(state).toMatchObject({ round: 2, pet: { name: "Luna" } });
  expect((await request.post(`${api}/api/matches/remove`, { data })).status()).toBe(204);
  await decide(request, 1, "save", 2);
  expect((await request.post(`${api}/api/matches/remove`, { data })).status()).toBe(409);
});

test("the BFF rejects missing origins, invalid inputs, and missing sessions", async ({ request }) => {
  const data = { petId: 1, saveVersion: randomUUID() };
  expect((await request.post("/api/matches/remove", { data })).status()).toBe(403);
  expect((await request.post("/api/matches/remove", { headers: { Origin: origin }, data: { petId: 0 } })).status()).toBe(400);
  const response = await request.post("/api/matches/remove", { headers: { Origin: origin }, data });
  expect(response.status()).toBe(401);
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("a removed pet returns through Explore again and can be saved again", async ({ page }) => {
  await register(page.request);
  for (let id = 1; id <= 67; id += 1) await decide(page.request, id, id === 1 ? "save" : "pass");
  await page.goto("/matches");
  await page.getByRole("button", { name: "Remove from Matches" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("No matches yet")).toBeVisible();
  await page.getByRole("link", { name: "Go to Discover" }).click();
  await expect(page.getByRole("heading", { name: "Luna", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Explore again" }).click();
  await expect(page.getByRole("heading", { name: "Luna", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Milo", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Matches", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Luna", exact: true })).toBeVisible();
});
