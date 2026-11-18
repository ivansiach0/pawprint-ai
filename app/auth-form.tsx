"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Label } from "radix-ui";
import * as styles from "./auth.css";
import { useHydrated } from "./use-hydrated";

export function AuthForm({ mode, recoveryEnabled = false, passwordReset = false }: {
  mode: "sign-in" | "sign-up";
  recoveryEnabled?: boolean;
  passwordReset?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();
  const registering = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    setPending(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        router.replace("/discover");
        return;
      }

      setError(response.status >= 500
        ? "Authentication is unavailable. Try again."
        : registering
          ? "Could not create your account. Check your details or try signing in."
          : "Could not sign in. Check your email and password.");
    } catch {
      setError("Authentication is unavailable. Try again.");
    }
    setPending(false);
  }

  return (
    <main className={styles.panel}>
      <Link href="/">Pawprint</Link>
      <h1>{registering ? "Create an account" : "Sign in"}</h1>
      {passwordReset && <p role="status">Password updated. Sign in with your new password.</p>}
      <form className={styles.form} method="post" onSubmit={submit}>
        {registering && (
          <div className={styles.field}>
            <Label.Root htmlFor="name">Name</Label.Root>
            <input id="name" name="name" autoComplete="name" required />
          </div>
        )}
        <div className={styles.field}>
          <Label.Root htmlFor="email">Email</Label.Root>
          <input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className={styles.field}>
          <Label.Root htmlFor="password">Password</Label.Root>
          <input id="password" name="password" type="password" required
            minLength={registering ? 8 : undefined}
            autoComplete={registering ? "new-password" : "current-password"} />
        </div>
        {error && <p role="alert">{error}</p>}
        <button className={styles.primary} disabled={!hydrated || pending}>
          {registering ? "Create account" : "Sign in"}
        </button>
      </form>
      {!registering && recoveryEnabled && <p><Link href="/forgot-password">Forgot password?</Link></p>}
      <p>
        {registering ? "Already have an account? " : "New to Pawprint? "}
        <Link href={registering ? "/sign-in" : "/sign-up"}>
          {registering ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </main>
  );
}
