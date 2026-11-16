import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchCatalog, type Pet } from "../catalog-api";
import { PetCard } from "../pet-card";
import { DiscoverDecision } from "./discover-decision";
import { ExploreAgain } from "./explore-again";
import { SignOutButton } from "./sign-out-button";
import * as styles from "./discover.css";

export default async function DiscoverPage() {
  const response = await fetchCatalog("/api/discover");
  if (response.status === 401) redirect("/sign-in");
  if (!response.ok) throw new Error("Discover is unavailable.");

  const { pet, canExploreAgain, allSaved } = (await response.json()) as {
    pet: Pet | null;
    canExploreAgain: boolean;
    allSaved: boolean;
  };

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
        <DiscoverDecision key={pet.id} petId={pet.id}>
          <PetCard pet={pet} featured />
        </DiscoverDecision>
      ) : canExploreAgain ? (
        <ExploreAgain />
      ) : allSaved ? (
        <section>
          <h2>You’ve saved all available pets</h2>
          <Link className={styles.navLink} href="/matches">View Matches</Link>
        </section>
      ) : (
        <p>No pets are available yet.</p>
      )}
    </main>
  );
}
