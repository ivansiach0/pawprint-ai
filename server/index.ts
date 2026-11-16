import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
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

app.get("/api/discover", async (request, response) => {
  response.set("Cache-Control", "no-store");
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });

  if (!session) {
    response.status(401).json({ error: "Sign in to open Discover." });
    return;
  }

  const [pet] = await db.select().from(schema.pet).orderBy(schema.pet.id).limit(1);
  response.json({ pet: pet ?? null });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, process.env.API_HOST ?? "127.0.0.1", () => {
  console.log(`Pawprint API listening on port ${port}`);
});
