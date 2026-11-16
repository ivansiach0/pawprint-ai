import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchCatalog, type Pet } from "../catalog-api";
import { PetCard } from "../pet-card";
import { DecisionButtons } from "./decision-buttons";
import { SignOutButton } from "./sign-out-button";
import * as styles from "./discover.css";

export default async function DiscoverPage() {
  const response = await fetchCatalog("/api/discover");
  if (response.status === 401) redirect("/sign-in");
  if (!response.ok) throw new Error("Discover is unavailable.");

  const { pet } = (await response.json()) as { pet: Pet | null };

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1>Discover</h1>
        <div className={styles.navigation}>
          <Link className={styles.navLink} href="/matches">Matches</Link>
          <SignOutButton />
        </div>
      </div>
      {pet ? (
        <>
          <PetCard pet={pet} featured />
          <DecisionButtons key={pet.id} petId={pet.id} />
        </>
      ) : (
        <p>No pets are available yet.</p>
      )}
    </main>
  );
}
