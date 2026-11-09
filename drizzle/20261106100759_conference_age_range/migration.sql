ALTER TABLE "conference" ADD COLUMN "participant_min_age" integer DEFAULT 15;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "participant_max_age" integer DEFAULT 21;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "supervisor_min_age" integer DEFAULT 21;