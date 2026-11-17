import { revalidatePath } from "next/cache";
import { fetchCatalog } from "../../../catalog-api";
import { publicOrigin } from "../../../deployment-env";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== publicOrigin()) return new Response(null, { status: 403 });

  const removal = await request.json().catch(() => null);
  if (!removal || !Number.isSafeInteger(removal.petId) || removal.petId < 1
    || removal.petId > 2147483647 || typeof removal.saveVersion !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(removal.saveVersion)) {
    return new Response(null, { status: 400 });
  }

  const response = await fetchCatalog("/api/matches/remove", {
    petId: removal.petId, saveVersion: removal.saveVersion,
  }).catch(() => null);
  if (response?.ok) {
    revalidatePath("/matches");
    revalidatePath("/discover");
  }
  return new Response(null, {
    status: response?.status ?? 503,
    headers: { "Cache-Control": "no-store" },
  });
}
