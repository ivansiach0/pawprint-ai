import { headers } from "next/headers";
import type { pet } from "../server/schema";

export type Pet = typeof pet.$inferSelect;

export async function fetchCatalog(
  path: "/api/discover" | "/api/discover/decisions" | "/api/matches",
  body?: { petId: number; choice: "pass" | "save" },
) {
  const cookie = (await headers()).get("cookie");
  const apiOrigin = process.env.PAWPRINT_API_ORIGIN;
  if (!apiOrigin) throw new Error("Set PAWPRINT_API_ORIGIN before opening the catalog.");

  const forwarded = new Headers();
  if (cookie) forwarded.set("Cookie", cookie);
  if (body) forwarded.set("Content-Type", "application/json");
  return fetch(new URL(path, apiOrigin), {
    method: body ? "POST" : "GET",
    headers: forwarded,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
}
