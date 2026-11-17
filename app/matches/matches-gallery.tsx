"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Dialog } from "radix-ui";
import type { SavedPet } from "../catalog-api";
import { PetCard } from "../pet-card";
import * as shared from "../discover/discover.css";
import * as styles from "./matches.css";

export function MatchesGallery({ pets }: { pets: SavedPet[] }) {
  const router = useRouter();
  const heading = useRef<HTMLHeadingElement>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const visible = pets.filter((pet) => !removed.includes(pet.saveVersion));

  function refresh() {
    heading.current?.focus();
    router.refresh();
  }

  function onRemoved(saveVersion: string) {
    setRemoved((previous) => [...previous, saveVersion]);
    refresh();
  }

  return (
    <>
      <div className={shared.header}>
        <h1 ref={heading} tabIndex={-1}>Matches</h1>
        {visible.length > 0 && <Link className={shared.navLink} href="/discover">Discover</Link>}
      </div>
      {visible.length > 0 ? (
        <div className={shared.gallery}>
          {visible.map((pet) => <SavedPetCard key={pet.saveVersion} pet={pet} onRemoved={onRemoved} onRefresh={refresh} />)}
        </div>
      ) : (
        <div>
          <p role="status">No matches yet</p>
          <Link className={shared.navLink} href="/discover">Go to Discover</Link>
        </div>
      )}
    </>
  );
}

function SavedPetCard({ pet, onRemoved, onRefresh }: {
  pet: SavedPet;
  onRemoved: (version: string) => void;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "error" | "conflict">("idle");
  const busy = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLElement>(null);

  async function remove() {
    if (busy.current) return;
    busy.current = true;
    if (status === "error") card.current?.focus();
    setOpen(false);
    setStatus("pending");
    try {
      const response = await fetch("/api/matches/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: pet.id, saveVersion: pet.saveVersion }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 401) {
        router.replace("/sign-in");
      } else if (response.ok) {
        onRemoved(pet.saveVersion);
      } else {
        setStatus(response.status === 409 ? "conflict" : "error");
      }
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }

  return (
    <section ref={card} tabIndex={-1} aria-label={`Saved pet: ${pet.name}`} className={styles.savedPet}>
      <PetCard pet={pet} />
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button className={shared.secondaryButton} disabled={status !== "idle"}>
            {status === "pending" ? "Removing…" : "Remove from Matches"}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.dialog} onCloseAutoFocus={(event) => {
            if (status !== "idle") {
              event.preventDefault();
              card.current?.focus();
            }
          }} onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancel.current?.focus();
          }}>
            <Dialog.Title>Remove {pet.name} from Matches?</Dialog.Title>
            <Dialog.Description>
              {pet.name} will return to Discover when you finish this round and choose Explore again.
            </Dialog.Description>
            <div className={styles.dialogActions}>
              <Dialog.Close asChild>
                <button ref={cancel} className={shared.secondaryButton}>Cancel</button>
              </Dialog.Close>
              <button className={shared.secondaryButton} onClick={remove}>Remove</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      {status === "pending" && <p role="status">Removing {pet.name}…</p>}
      {status === "error" && <div>
        <p role="alert">Removal could not be confirmed. Try again.</p>
        <button className={shared.secondaryButton} onClick={remove}>Try again</button>
      </div>}
      {status === "conflict" && <div>
        <p role="alert">Matches has changed. Refresh before removing this pet.</p>
        <button className={shared.secondaryButton} onClick={onRefresh}>Refresh Matches</button>
      </div>}
    </section>
  );
}
