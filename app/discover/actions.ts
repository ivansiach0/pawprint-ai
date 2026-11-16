"use server";

import { redirect } from "next/navigation";
import { fetchCatalog } from "../catalog-api";

export async function exploreAgain() {
  const response = await fetchCatalog("/api/discover/explore-again").catch(() => null);
  if (response?.status === 401) redirect("/sign-in");
  if (!response?.ok) return "Could not start another round.";

  redirect("/discover");
}
