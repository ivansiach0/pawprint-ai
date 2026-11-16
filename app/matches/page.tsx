import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchCatalog, type Pet } from "../catalog-api";
import { PetCard } from "../pet-card";
import * as styles from "../discover/discover.css";

export default async function MatchesPage() {
  const response = await fetchCatalog("/api/matches");
  if (response.status === 401) redirect("/sign-in");
  if (!response.ok) throw new Error("Matches is unavailable.");

  const { pets } = (await response.json()) as { pets: Pet[] };

  return (
    <main className={styles.galleryPage}>
      <div className={styles.header}>
        <h1>Matches</h1>
        {pets.length > 0 && <Link className={styles.navLink} href="/discover">Discover</Link>}
      </div>
      {pets.length > 0 ? (
        <div className={styles.gallery}>
          {pets.map((pet) => <PetCard key={pet.id} pet={pet} />)}
        </div>
      ) : (
        <div>
          <p>No matches yet</p>
          <Link className={styles.navLink} href="/discover">Go to Discover</Link>
        </div>
      )}
    </main>
  );
}
