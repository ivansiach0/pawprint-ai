import { revalidatePath } from "next/cache";
import { fetchCatalog } from "../../../catalog-api";
import { publicOrigin } from "../../../deployment-env";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== publicOrigin()) {
    return new Response(null, { status: 403 });
  }

  const decision = await request.json().catch(() => null);
  if (!decision || !Number.isSafeInteger(decision.petId) || !Number.isSafeInteger(decision.round)
    || (decision.choice !== "pass" && decision.choice !== "save")) {
    return new Response(null, { status: 400 });
  }

  const response = await fetchCatalog("/api/discover/decisions", {
    petId: decision.petId,
    round: decision.round,
    choice: decision.choice,
  }).catch(() => null);

  if (response?.ok) revalidatePath("/matches");
  return new Response(null, {
    status: response?.status ?? 503,
    headers: { "Cache-Control": "no-store" },
  });
}
