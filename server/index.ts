import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { and, eq, notExists, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import express from "express";
import * as schema from "./schema";
import { passwordPolicy, passwordRecoveryRouter } from "./password-recovery";

const { DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET } = process.env;

if (!DATABASE_URL || !BETTER_AUTH_URL || !BETTER_AUTH_SECRET) {
  throw new Error("Set DATABASE_URL, BETTER_AUTH_URL, and BETTER_AUTH_SECRET before starting the API.");
}

const db = drizzle(DATABASE_URL, { schema });

const auth = betterAuth({
  baseURL: BETTER_AUTH_URL,
  secret: BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    transaction: true,
  }),
  emailAndPassword: { enabled: true, ...passwordPolicy },
  disabledPaths: ["/request-password-reset", "/reset-password"],
});

const app = express();

app.get("/health", (_request, response) => {
  response.sendStatus(200);
});

app.use("/api/auth", passwordRecoveryRouter(db));
app.all("/api/auth/*action", toNodeHandler(auth));

const { pet, swipeDecision, user, matchSave } = schema;
const catalog = express.Router();

catalog.use(["/discover", "/matches"], async (request, response, next) => {
  response.set("Cache-Control", "no-store");
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });

  if (!session) {
    response.status(401).json({ error: "Sign in to open Discover." });
    return;
  }

  response.locals.userId = session.user.id;
  next();
});

function decisionsFor(userId: string) {
  return and(eq(swipeDecision.userId, userId), eq(swipeDecision.petId, pet.id));
}

catalog.get("/discover", async (_request, response) => {
  const userId: string = response.locals.userId;
  const entries = await db.select({ pet, choice: swipeDecision.choice, round: user.discoverRound }).from(pet)
    .innerJoin(user, eq(user.id, userId))
    .leftJoin(swipeDecision, decisionsFor(userId)).orderBy(pet.id);
  const nextPet = entries.find((entry) => entry.choice === null)?.pet ?? null;
  const hasPassedPets = entries.some((entry) => entry.choice === "pass");

  response.json({
    pet: nextPet,
    round: entries[0]?.round ?? 0,
    canExploreAgain: nextPet === null && hasPassedPets,
    allSaved: entries.length > 0 && nextPet === null && !hasPassedPets,
  });
});

catalog.post("/discover/explore-again", express.json(), async (request, response) => {
  const userId: string = response.locals.userId;
  const { round } = request.body ?? {};
  if (!Number.isSafeInteger(round) || round < 0) {
    response.sendStatus(400);
    return;
  }

  await db.transaction(async (transaction) => {
    const [account] = await transaction.select({ round: user.discoverRound }).from(user)
      .where(eq(user.id, userId)).for("update");
    if (account?.round !== round) return;

    const decided = transaction.select({ petId: swipeDecision.petId }).from(swipeDecision)
      .where(decisionsFor(userId));
    const undecided = transaction.select({ id: pet.id }).from(pet).where(notExists(decided));
    const reset = await transaction.delete(swipeDecision).where(and(
      eq(swipeDecision.userId, userId),
      eq(swipeDecision.choice, "pass"),
      notExists(undecided),
    )).returning({ petId: swipeDecision.petId });

    if (reset.length > 0) {
      await transaction.update(user).set({ discoverRound: sql`${user.discoverRound} + 1` })
        .where(eq(user.id, userId));
    }
  });
  response.sendStatus(204);
});

catalog.post("/discover/decisions", express.json(), async (request, response) => {
  const { petId, choice, round } = request.body ?? {};
  if (!Number.isSafeInteger(petId) || petId < 1 || petId > 2147483647
    || !Number.isSafeInteger(round) || round < 0
    || (choice !== "pass" && choice !== "save")) {
    response.status(400).json({ error: "Choose a valid pet and decision." });
    return;
  }

  const userId: string = response.locals.userId;
  const status = await db.transaction(async (transaction) => {
    const [account] = await transaction.select({ round: user.discoverRound }).from(user)
      .where(eq(user.id, userId)).for("update");
    if (account?.round !== round) return 409;

    const [selectedPet] = await transaction.select({ id: pet.id }).from(pet).where(eq(pet.id, petId));
    if (!selectedPet) return 404;

    const [stored] = await transaction.select({ choice: swipeDecision.choice }).from(swipeDecision)
      .where(and(eq(swipeDecision.userId, userId), eq(swipeDecision.petId, petId)));
    if (stored) return stored.choice === choice ? 204 : 409;

    await transaction.insert(swipeDecision).values({ userId, petId, choice });
    if (choice === "save") {
      const saveVersion = randomUUID();
      await transaction.insert(matchSave).values({ userId, petId, saveVersion })
        .onConflictDoUpdate({
          target: [matchSave.userId, matchSave.petId],
          set: { saveVersion, removed: false },
        });
    }
    return 204;
  });
  response.sendStatus(status);
});

catalog.post("/matches/remove", express.json(), async (request, response) => {
  const { petId, saveVersion } = request.body ?? {};
  if (!Number.isSafeInteger(petId) || petId < 1 || petId > 2147483647
    || typeof saveVersion !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saveVersion)) {
    response.sendStatus(400);
    return;
  }

  const userId: string = response.locals.userId;
  const status = await db.transaction(async (transaction) => {
    await transaction.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
    const target = and(eq(matchSave.userId, userId), eq(matchSave.petId, petId));
    const [saved] = await transaction.select().from(matchSave).where(target);
    if (!saved || saved.saveVersion !== saveVersion) return 409;
    if (saved.removed) return 204;

    await transaction.update(swipeDecision).set({ choice: "pass" })
      .where(and(eq(swipeDecision.userId, userId), eq(swipeDecision.petId, petId)));
    await transaction.update(matchSave).set({ removed: true }).where(target);
    return 204;
  });
  response.sendStatus(status);
});

catalog.get("/matches", async (_request, response) => {
  const userId: string = response.locals.userId;
  const saved = await db.select({ pet, saveVersion: matchSave.saveVersion }).from(swipeDecision)
    .innerJoin(pet, eq(swipeDecision.petId, pet.id))
    .innerJoin(matchSave, and(eq(matchSave.userId, swipeDecision.userId), eq(matchSave.petId, pet.id)))
    .where(and(eq(swipeDecision.userId, userId), eq(swipeDecision.choice, "save")))
    .orderBy(pet.id);
  response.json({ pets: saved.map((entry) => ({ ...entry.pet, saveVersion: entry.saveVersion })) });
});

app.use("/api", catalog);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, process.env.API_HOST ?? "127.0.0.1", () => {
  console.log(`Pawprint API listening on port ${port}`);
});
