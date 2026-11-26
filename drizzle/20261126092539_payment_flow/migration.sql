ALTER TYPE "email_kind" ADD VALUE 'PAYMENT_DEADLINE_REMINDER' BEFORE 'CHASE_INTRO_REMINDER';--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "payment_deadline" timestamp(3);--> statement-breakpoint
ALTER TABLE "conference_participant" ADD COLUMN "payment_info_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "transfer_reported_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "discarded_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "payment_guide_completed_at" timestamp(3);