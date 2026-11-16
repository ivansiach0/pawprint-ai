import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as styles from "../auth.css";

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

  const { name } = (await response.json()) as { name: string };

  return (
    <main className={styles.panel}>
      <h1>Discover</h1>
      <p>Welcome, {name}. The pet catalog is coming next.</p>
    </main>
  );
}
