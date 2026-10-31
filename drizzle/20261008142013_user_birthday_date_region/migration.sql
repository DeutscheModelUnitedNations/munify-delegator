ALTER TABLE "user" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "birthday" SET DATA TYPE date USING "birthday"::date;