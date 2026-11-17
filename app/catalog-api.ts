import { headers } from "next/headers";
import type { pet } from "../server/schema";
import { privateApiOrigin } from "./deployment-env";

export type Pet = typeof pet.$inferSelect;

export async function fetchCatalog(
  path: "/api/discover" | "/api/discover/decisions" | "/api/discover/explore-again" | "/api/matches",
  body?: { round: number; petId: number; choice: "pass" | "save" } | { round: number },
) {
  const cookie = (await headers()).get("cookie");
  const apiOrigin = privateApiOrigin();
  if (!apiOrigin) throw new Error("Set PAWPRINT_API_ORIGIN or PAWPRINT_API_HOSTPORT before opening the catalog.");

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
