"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { primary } from "../auth.css";
import * as styles from "./discover.css";

type Choice = "pass" | "save";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export function DecisionButtons({ petId }: { petId: number }) {
  const router = useRouter();
  const [retryChoice, setRetryChoice] = useState<Choice | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const disabled = !hydrated || submitting || refreshing;

  async function submit(choice: Choice) {
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/discover/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petId, choice }),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null);

    setSubmitting(false);

    if (response?.status === 401) {
      startTransition(() => router.replace("/sign-in"));
      return;
    }

    if (response?.ok) {
      setRetryChoice(null);
      startTransition(() => router.refresh());
      return;
    }

    setRetryChoice(choice);
    setError("Could not confirm your decision.");
  }

  return (
    <>
      <div className={styles.actions}>
        {retryChoice ? (
          <button className={primary} type="button" disabled={disabled} onClick={() => submit(retryChoice)}>
            Try again
          </button>
        ) : (
          <>
            <button className={styles.secondaryButton} type="button" disabled={disabled} onClick={() => submit("pass")}>
              Pass
            </button>
            <button className={primary} type="button" disabled={disabled} onClick={() => submit("save")}>
              Save
            </button>
          </>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
