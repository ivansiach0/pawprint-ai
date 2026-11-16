import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { pet as petTable } from "../../server/schema";
import { SignOutButton } from "./sign-out-button";
import * as styles from "./discover.css";

export default async function DiscoverPage() {
  const cookie = (await headers()).get("cookie");
  const apiOrigin = process.env.PAWPRINT_API_ORIGIN;
  if (!apiOrigin) throw new Error("Set PAWPRINT_API_ORIGIN before opening Discover.");

  const response = await fetch(new URL("/api/discover", apiOrigin), {
    headers: cookie ? { Cookie: cookie } : {},
    cache: "no-store",
  });

  if (response.status === 401) redirect("/sign-in");
  if (!response.ok) throw new Error("Discover is unavailable.");

  const { pet } = (await response.json()) as { pet: typeof petTable.$inferSelect | null };

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1>Discover</h1>
        <SignOutButton />
      </div>
      {pet ? (
        <article className={styles.card}>
          <Image
            className={styles.photo}
            src={pet.imageUrl}
            alt={pet.name}
            fill
            preload
            sizes="(max-width: 532px) calc(100vw - 32px), 500px"
          />
          <div className={styles.details}>
            <h2 className={styles.name}>{pet.name}</h2>
            <p className={styles.description}>
              {pet.species} · {pet.age} {pet.age === 1 ? "year" : "years"} old
            </p>
          </div>
        </article>
      ) : (
        <p>No pets are available yet.</p>
      )}
    </main>
  );
}
