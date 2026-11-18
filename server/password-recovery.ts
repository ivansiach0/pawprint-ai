import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import express from "express";
import { localRecoveryEnabled, recoveryActions } from "../shared/local-recovery";
import * as schema from "./schema";

export const passwordPolicy = { minPasswordLength: 8, maxPasswordLength: 128 };
const lifetime = 30 * 60 * 1000;
const { account, passwordReset, session, user } = schema;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const validToken = (token: unknown): token is string => typeof token === "string" && /^[a-f0-9]{64}$/.test(token);

function localOrigin(value: string | undefined) {
  if (!value) throw new Error("Local recovery origin is missing.");
  const url = new URL(value);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Recovery requires an HTTP loopback origin.");
  }
  return url.origin;
}

export function passwordRecoveryRouter(db: NodePgDatabase<typeof schema>) {
  const router = express.Router();
  router.use((request, response, next) => {
    const action = request.path.split("/")[1].toLowerCase();
    if (!recoveryActions.includes(action)) return next("router");
    response.set("Cache-Control", "no-store");
    if (!localRecoveryEnabled()) return void response.sendStatus(404);
    if (request.method !== "POST" || request.path.split("/").filter(Boolean).length !== 1) {
      return void response.sendStatus(404);
    }
    if (request.get("origin") !== process.env.BETTER_AUTH_URL) return void response.sendStatus(403);
    next();
  });
  router.use(express.json({ limit: "8kb" }));

  async function findReset(token: string) {
    const [reset] = await db.select().from(passwordReset).where(eq(passwordReset.tokenHash, tokenHash(token)));
    return reset && reset.expiresAt.getTime() > Date.now() ? reset : null;
  }

  router.post("/request-password-reset", async (request, response) => {
    const { email, redirectTo } = request.body ?? {};
    if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || redirectTo !== undefined) return void response.sendStatus(400);
    const origin = localOrigin(process.env.BETTER_AUTH_URL);
    const mailpit = localOrigin(process.env.MAILPIT_ORIGIN);
    const [existing] = await db.select({ id: user.id, email: user.email }).from(user)
      .innerJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "credential")))
      .where(eq(user.email, email.toLowerCase()));
    if (!existing) return void response.sendStatus(204);

    await db.transaction(async (transaction) => {
      await transaction.select({ id: user.id }).from(user).where(eq(user.id, existing.id)).for("update");
      const token = randomBytes(32).toString("hex");
      const reset = { userId: existing.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + lifetime) };
      await transaction.insert(passwordReset).values(reset).onConflictDoUpdate({
        target: passwordReset.userId, set: { tokenHash: reset.tokenHash, expiresAt: reset.expiresAt },
      });
      // Fragments stay out of HTTP access logs and referrer headers.
      const link = new URL("/reset-password", origin);
      link.hash = new URLSearchParams({ token }).toString();
      const sent = await fetch(`${mailpit}/api/v1/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Name: "Pawprint", Email: "no-reply@pawprint.test" },
          To: [{ Email: existing.email }],
          Subject: "Reset your Pawprint password",
          Text: `Choose a new password for your Pawprint account:\n\n${link.href}\n\nThis link expires in 30 minutes and can be used once. Only your most recent link works. If you did not request this, you can ignore this email.`,
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!sent.ok) throw new Error("Local mail delivery failed.");
    });
    response.sendStatus(204);
  });

  router.post("/validate-reset-token", async (request, response) => {
    const { token } = request.body ?? {};
    response.sendStatus(validToken(token) && await findReset(token) ? 204 : 410);
  });

  router.post("/reset-password", async (request, response) => {
    const { token, newPassword } = request.body ?? {};
    if (!validToken(token)) return void response.sendStatus(410);
    if (typeof newPassword !== "string" || newPassword.length < passwordPolicy.minPasswordLength
      || newPassword.length > passwordPolicy.maxPasswordLength) return void response.sendStatus(400);
    const reset = await findReset(token);
    if (!reset) return void response.sendStatus(410);
    const password = await hashPassword(newPassword);
    const status = await db.transaction(async (transaction) => {
      await transaction.select({ id: user.id }).from(user).where(eq(user.id, reset.userId)).for("update");
      const [current] = await transaction.select().from(passwordReset).where(eq(passwordReset.userId, reset.userId));
      if (!current || current.tokenHash !== reset.tokenHash || current.expiresAt.getTime() <= Date.now()) return 410;
      const updated = await transaction.update(account).set({ password, updatedAt: new Date() })
        .where(and(eq(account.userId, reset.userId), eq(account.providerId, "credential")))
        .returning({ id: account.id });
      if (updated.length !== 1) throw new Error("Credential account is unavailable.");
      await transaction.delete(session).where(eq(session.userId, reset.userId));
      await transaction.delete(passwordReset).where(eq(passwordReset.userId, reset.userId));
      return 204;
    });
    response.sendStatus(status);
  });

  router.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    if (response.headersSent) return next(new Error("Local password recovery request failed."));
    if (error instanceof SyntaxError) return void response.sendStatus(400);
    console.error("Local password recovery request failed.");
    response.sendStatus(503);
  });
  return router;
}
