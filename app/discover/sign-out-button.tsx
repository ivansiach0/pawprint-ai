"use client";

import { useState } from "react";
import * as styles from "./discover.css";

export function SignOutButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setPending(true);
    setFailed(false);

    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });

      if (response.ok) {
        window.location.replace("/");
        return;
      }
    } catch {
      // A network failure has the same recovery as an unsuccessful response.
    }

    setFailed(true);
    setPending(false);
  }

  return (
    <div>
      <button className={styles.secondaryButton} type="button" disabled={pending} onClick={signOut}>
        Sign out
      </button>
      {failed && <p role="alert">Could not sign out. Try again.</p>}
    </div>
  );
}
