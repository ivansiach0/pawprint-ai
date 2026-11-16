import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { and, eq, notExists } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import express from "express";
import * as schema from "./schema";

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
  }),
  emailAndPassword: { enabled: true },
});

const app = express();

app.get("/health", (_request, response) => {
  response.sendStatus(200);
});

app.all("/api/auth/*action", toNodeHandler(auth));

const { pet, swipeDecision } = schema;
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
  const entries = await db.select({ pet, choice: swipeDecision.choice }).from(pet)
    .leftJoin(swipeDecision, decisionsFor(userId)).orderBy(pet.id);
  const nextPet = entries.find((entry) => entry.choice === null)?.pet ?? null;
  const hasPassedPets = entries.some((entry) => entry.choice === "pass");

  response.json({
    pet: nextPet,
    canExploreAgain: nextPet === null && hasPassedPets,
    allSaved: entries.length > 0 && nextPet === null && !hasPassedPets,
  });
});

catalog.post("/discover/explore-again", async (_request, response) => {
  const userId: string = response.locals.userId;
  const decided = db.select({ petId: swipeDecision.petId }).from(swipeDecision)
    .where(decisionsFor(userId));
  const undecided = db.select({ id: pet.id }).from(pet).where(notExists(decided));

  await db.delete(swipeDecision).where(and(
    eq(swipeDecision.userId, userId),
    eq(swipeDecision.choice, "pass"),
    notExists(undecided),
  ));
  response.sendStatus(204);
});

catalog.post("/discover/decisions", express.json(), async (request, response) => {
  const { petId, choice } = request.body ?? {};
  if (!Number.isSafeInteger(petId) || petId < 1 || petId > 2147483647
    || (choice !== "pass" && choice !== "save")) {
    response.status(400).json({ error: "Choose a valid pet and decision." });
    return;
  }

  const [selectedPet] = await db.select({ id: pet.id }).from(pet).where(eq(pet.id, petId));
  if (!selectedPet) {
    response.status(404).json({ error: "Pet not found." });
    return;
  }

  const userId: string = response.locals.userId;
  await db.insert(swipeDecision).values({ userId, petId, choice }).onConflictDoNothing();
  response.sendStatus(204);
});

catalog.get("/matches", async (_request, response) => {
  const userId: string = response.locals.userId;
  const saved = await db.select({ pet }).from(swipeDecision)
    .innerJoin(pet, eq(swipeDecision.petId, pet.id))
    .where(and(eq(swipeDecision.userId, userId), eq(swipeDecision.choice, "save")))
    .orderBy(pet.id);
  response.json({ pets: saved.map((entry) => entry.pet) });
});

app.use("/api", catalog);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, process.env.API_HOST ?? "127.0.0.1", () => {
  console.log(`Pawprint API listening on port ${port}`);
});
