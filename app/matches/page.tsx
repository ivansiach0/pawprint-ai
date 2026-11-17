import { redirect } from "next/navigation";
import { fetchCatalog, type SavedPet } from "../catalog-api";
import { MatchesGallery } from "./matches-gallery";
import * as styles from "../discover/discover.css";

export default async function MatchesPage() {
  const response = await fetchCatalog("/api/matches");
  if (response.status === 401) redirect("/sign-in");
  if (!response.ok) throw new Error("Matches is unavailable.");

  const { pets } = (await response.json()) as { pets: SavedPet[] };

  return (
    <main className={styles.galleryPage}>
      <MatchesGallery pets={pets} />
    </main>
  );
}
