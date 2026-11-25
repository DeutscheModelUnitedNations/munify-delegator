ALTER TABLE "conference_participant" ADD COLUMN "postal_info_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conference_participant" ADD COLUMN "postal_confirmed_details" text;--> statement-breakpoint
ALTER TABLE "conference_participant" ADD COLUMN "postal_confirmed_of_age" boolean;