"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchCatalog } from "../catalog-api";

export async function recordDecision(petId: number, _previous: string, form: FormData) {
  const choice = form.get("choice");
  if (choice !== "pass" && choice !== "save") return "Choose Pass or Save.";

  const response = await fetchCatalog("/api/discover/decisions", { petId, choice })
    .catch(() => null);
  if (response?.status === 401) redirect("/sign-in");
  if (!response?.ok) return "Could not record your decision.";

  revalidatePath("/matches");
  redirect("/discover");
}
