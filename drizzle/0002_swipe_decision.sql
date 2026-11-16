CREATE TYPE "public"."swipe_choice" AS ENUM('pass', 'save');--> statement-breakpoint
CREATE TABLE "swipe_decision" (
	"user_id" text NOT NULL,
	"pet_id" integer NOT NULL,
	"choice" "swipe_choice" NOT NULL,
	CONSTRAINT "swipe_decision_user_id_pet_id_pk" PRIMARY KEY("user_id","pet_id")
);
--> statement-breakpoint
ALTER TABLE "swipe_decision" ADD CONSTRAINT "swipe_decision_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "swipe_decision" ADD CONSTRAINT "swipe_decision_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE no action ON UPDATE no action;