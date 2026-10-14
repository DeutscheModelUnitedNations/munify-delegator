ALTER TABLE "attendance_session" ADD COLUMN "check_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD COLUMN "collects_access_cards" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "nametag_bin_count" integer DEFAULT 3 NOT NULL;