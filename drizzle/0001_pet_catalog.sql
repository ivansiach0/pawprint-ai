CREATE TABLE "pet" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"age" integer NOT NULL,
	"image_url" text NOT NULL,
	CONSTRAINT "pet_image_url_unique" UNIQUE("image_url"),
	CONSTRAINT "pet_age_nonnegative" CHECK ("pet"."age" >= 0)
);
