CREATE TABLE "match_save" (
	"user_id" text NOT NULL,
	"pet_id" integer NOT NULL,
	"save_version" text NOT NULL,
	"removed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "match_save_user_id_pet_id_pk" PRIMARY KEY("user_id","pet_id")
);
--> statement-breakpoint
ALTER TABLE "match_save" ADD CONSTRAINT "match_save_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_save" ADD CONSTRAINT "match_save_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "match_save" ("user_id", "pet_id", "save_version", "removed")
SELECT "user_id", "pet_id", gen_random_uuid()::text, false
FROM "swipe_decision"
WHERE "choice" = 'save';
