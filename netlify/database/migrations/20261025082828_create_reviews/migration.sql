CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"rating" smallint NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
