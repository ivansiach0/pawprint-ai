"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Label } from "radix-ui";
import * as styles from "./auth.css";
import { useHydrated } from "./use-hydrated";

function RecoveryPanel({ title, children }: { title: string; children: ReactNode }) {
  return <main className={styles.panel}>
    <Link href="/">Pawprint</Link>
    <h1>{title}</h1>
    {children}
    <p><Link href="/sign-in">Sign in</Link></p>
  </main>;
}

function postRecovery(action: string, data: Record<string, string>, signal?: AbortSignal) {
  return fetch(`/api/auth/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data), signal,
  });
}

export function ForgotPasswordForm() {
  const hydrated = useHydrated();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const notice = useRef<HTMLParagraphElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const email = String(new FormData(event.currentTarget).get("email"));
    setError("");
    setPending(true);
    try {
      const response = await postRecovery("request-password-reset", { email });
      if (response.ok) setSent(true);
      else setError("Password recovery is unavailable. Please try again.");
    } catch {
      setError("Password recovery is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => { if (sent) notice.current?.focus(); }, [sent]);

  return <RecoveryPanel title="Forgot password?">
    {sent ? <p ref={notice} tabIndex={-1} role="status">
      If an account exists for this email, you&apos;ll receive a password reset link.
    </p> : <form className={styles.form} method="post" onSubmit={submit}>
      <div className={styles.field}>
        <Label.Root htmlFor="recovery-email">Email</Label.Root>
        <input id="recovery-email" name="email" type="email" autoComplete="email" required maxLength={254} disabled={!hydrated || pending} />
      </div>
      {error && <p role="alert">{error}</p>}
      <button className={styles.primary} disabled={!hydrated || pending}>Send reset link</button>
    </form>}
  </RecoveryPanel>;
}

export function ResetPasswordForm() {
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "unavailable">("checking");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const token = useRef("");
  const notice = useRef<HTMLParagraphElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let controller = new AbortController();
    function validate() {
      controller.abort();
      controller = new AbortController();
      const { signal } = controller;
      token.current = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
      postRecovery("validate-reset-token", { token: token.current }, signal)
        .then((response) => {
          if (!signal.aborted) setStatus(response.ok ? "ready" : response.status === 410 ? "invalid" : "unavailable");
        }).catch(() => { if (!signal.aborted) setStatus("unavailable"); });
    }
    function changed() {
      setStatus("checking");
      setError("");
      setPending(false);
      validate();
    }
    validate();
    window.addEventListener("hashchange", changed);
    return () => {
      controller.abort();
      window.removeEventListener("hashchange", changed);
    };
  }, []);

  useEffect(() => {
    if (status === "invalid" || status === "unavailable") notice.current?.focus();
  }, [status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword"));
    if (newPassword !== data.get("confirmation")) {
      setError("Passwords do not match.");
      confirmation.current?.focus();
      return;
    }
    setError("");
    setPending(true);
    const submittedToken = token.current;
    try {
      const response = await postRecovery("reset-password", { token: submittedToken, newPassword });
      if (submittedToken !== token.current) return;
      if (response.ok) {
        window.location.replace("/sign-in?reset=success");
        return;
      }
      if (response.status === 410) setStatus("invalid");
      else setError(response.status === 400 ? "Use a password between 8 and 128 characters." : "Password recovery is unavailable. Please try again.");
    } catch {
      if (submittedToken !== token.current) return;
      setError("Password recovery is unavailable. Please try again.");
    }
    setPending(false);
  }

  return <RecoveryPanel title="Reset password">
    {status === "checking" && <p role="status">Checking reset link…</p>}
    {status === "invalid" && <p ref={notice} tabIndex={-1} role="alert">This reset link is invalid or has expired</p>}
    {status === "unavailable" && <p ref={notice} tabIndex={-1} role="alert">Password recovery is unavailable. Please try again.</p>}
    {status === "ready" && <form className={styles.form} method="post" onSubmit={submit}>
      <div className={styles.field}>
        <Label.Root htmlFor="new-password">New password</Label.Root>
        <input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </div>
      <div className={styles.field}>
        <Label.Root htmlFor="confirm-password">Confirm new password</Label.Root>
        <input ref={confirmation} id="confirm-password" name="confirmation" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
      </div>
      {error && <p role="alert">{error}</p>}
      <button className={styles.primary} disabled={pending}>Reset password</button>
    </form>}
    <p><Link href="/forgot-password">Request a new link</Link></p>
  </RecoveryPanel>;
}
