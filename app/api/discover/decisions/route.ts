import { revalidatePath } from "next/cache";
import { fetchCatalog } from "../../../catalog-api";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== process.env.BETTER_AUTH_URL) {
    return new Response(null, { status: 403 });
  }

  const decision = await request.json().catch(() => null);
  if (!decision || !Number.isSafeInteger(decision.petId)
    || (decision.choice !== "pass" && decision.choice !== "save")) {
    return new Response(null, { status: 400 });
  }

  const response = await fetchCatalog("/api/discover/decisions", {
    petId: decision.petId,
    choice: decision.choice,
  }).catch(() => null);

  if (response?.ok) revalidatePath("/matches");
  return new Response(null, {
    status: response?.status ?? 503,
    headers: { "Cache-Control": "no-store" },
  });
}
