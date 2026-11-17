"use client";

import { useActionState } from "react";
import { primary } from "../auth.css";
import { exploreAgain } from "./actions";

export function ExploreAgain({ round }: { round: number }) {
  const [error, submit, pending] = useActionState(exploreAgain.bind(null, round), "");

  return (
    <section>
      <h2>You’ve seen all the pets</h2>
      <form action={submit}>
        <button className={primary} disabled={pending}>Explore again</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
