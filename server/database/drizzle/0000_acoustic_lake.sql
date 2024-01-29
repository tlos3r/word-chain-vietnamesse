CREATE TABLE IF NOT EXISTS "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar,
	"name" varchar(20),
	"roomId" varchar(5)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
	"id" varchar(5) PRIMARY KEY NOT NULL,
	"finished" boolean,
	"timeToAnswers" smallint,
	"host" varchar,
	"turn" smallint,
	CONSTRAINT "rooms_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "words" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" varchar
);
