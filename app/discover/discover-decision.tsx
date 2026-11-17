"use client";

import { useRouter } from "next/navigation";
import {
  useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, useTransition,
  type PointerEvent, type ReactNode,
} from "react";
import { primary } from "../auth.css";
import * as styles from "./discover.css";

type Choice = "pass" | "save";

const subscribeToHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

const swipeThreshold = 72;

export function DiscoverDecision({ petId, round, children }: { petId: number; round: number; children: ReactNode }) {
  const router = useRouter();
  const [retryChoice, setRetryChoice] = useState<Choice | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(subscribeToHydration, clientReady, serverReady);
  const disabled = !hydrated || submitting || refreshing;

  const canDecide = !disabled && !retryChoice && !stale;
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [offset, setOffset] = useState(0);

  async function submit(choice: Choice) {
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/discover/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ petId, choice, round }),
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

    if (response?.status === 409) {
      setStale(true);
      setError("Your Discover progress changed. Refresh to continue.");
      return;
    }

    setRetryChoice(choice);
    setError("Could not confirm your decision.");
  }

  const onArrow = useEffectEvent((event: KeyboardEvent) => {
    if (!canDecide || event.defaultPrevented || event.repeat || event.altKey
      || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (event.target instanceof HTMLElement
      && event.target.closest("input, textarea, select, [contenteditable], [role=slider]")) return;

    event.preventDefault();
    void submit(event.key === "ArrowLeft" ? "pass" : "save");
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => onArrow(event);
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!canDecide || !event.isPrimary || event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const horizontal = event.clientX - start.x;
    const vertical = event.clientY - start.y;
    setOffset(Math.abs(horizontal) > Math.abs(vertical) ? horizontal : 0);
  }

  function cancelDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setOffset(0);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    cancelDrag(event);

    const horizontal = event.clientX - start.x;
    const vertical = event.clientY - start.y;
    if (canDecide && Math.abs(horizontal) >= swipeThreshold
      && Math.abs(horizontal) > Math.abs(vertical)) {
      void submit(horizontal < 0 ? "pass" : "save");
    }
  }

  return (
    <>
      <div
        className={styles.swipeSurface}
        data-swipe-enabled={canDecide}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
        onDragStart={(event) => event.preventDefault()}
        style={{ transform: `translateX(${offset}px)` }}
      >
        {children}
      </div>
      <div className={styles.actions}>
        {stale ? (
          <button className={primary} type="button" disabled={disabled} onClick={() => window.location.reload()}>
            Refresh Discover
          </button>
        ) : retryChoice ? (
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
