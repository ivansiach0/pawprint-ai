import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

const date = (name: string) => timestamp(name, { withTimezone: true });

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  discoverRound: integer("discover_round").notNull().default(0),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: date("created_at").notNull().defaultNow(),
  updatedAt: date("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  expiresAt: date("expires_at").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
  updatedAt: date("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [index("session_user_id_idx").on(table.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: date("access_token_expires_at"),
  refreshTokenExpiresAt: date("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: date("created_at").notNull().defaultNow(),
  updatedAt: date("updated_at").notNull().defaultNow(),
}, (table) => [index("account_user_id_idx").on(table.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: date("expires_at").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
  updatedAt: date("updated_at").notNull().defaultNow(),
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

export const pet = pgTable("pet", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  species: text("species").notNull(),
  age: integer("age").notNull(),
  imageUrl: text("image_url").notNull().unique(),
}, (table) => [check("pet_age_nonnegative", sql`${table.age} >= 0`)]);

export const swipeChoice = pgEnum("swipe_choice", ["pass", "save"]);

export const swipeDecision = pgTable("swipe_decision", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  petId: integer("pet_id").notNull().references(() => pet.id),
  choice: swipeChoice("choice").notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.petId] })]);

// Retained across round resets so old removals cannot target a later save.
export const matchSave = pgTable("match_save", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  petId: integer("pet_id").notNull().references(() => pet.id),
  saveVersion: text("save_version").notNull(),
  removed: boolean("removed").notNull().default(false),
}, (table) => [primaryKey({ columns: [table.userId, table.petId] })]);

export const passwordReset = pgTable("password_reset", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: date("expires_at").notNull(),
});
