CREATE TYPE "chase_access" AS ENUM('SPECTATOR', 'TEAM', 'NONE');--> statement-breakpoint
CREATE TYPE "instance_link_status" AS ENUM('PENDING', 'ACTIVE', 'FROZEN');--> statement-breakpoint
ALTER TYPE "email_kind" ADD VALUE 'CHASE_INTRO_REMINDER' BEFORE 'CERTIFICATE_AVAILABLE';--> statement-breakpoint
CREATE TABLE "chase_presence" (
	"conference_id" text PRIMARY KEY,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp(3) NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instance_link" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"remote_url" text NOT NULL,
	"status" "instance_link_status" DEFAULT 'PENDING'::"instance_link_status" NOT NULL,
	"inbound_token_hash" text NOT NULL,
	"outbound_token" text,
	"confirmation_code" text NOT NULL,
	"linked_at" timestamp(3),
	"last_event_at" timestamp(3),
	"last_reconcile_at" timestamp(3),
	"last_error" text
);
--> statement-breakpoint
ALTER TABLE "conference_participant" ADD COLUMN "nsa_card_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "conference_role" ADD COLUMN "chase_access" "chase_access" DEFAULT 'SPECTATOR'::"chase_access" NOT NULL;--> statement-breakpoint
ALTER TABLE "resolution" ADD COLUMN "chase_paper_id" text;--> statement-breakpoint
ALTER TABLE "resolution" ADD COLUMN "chase_snapshot_id" text;--> statement-breakpoint
ALTER TABLE "resolution" ADD CONSTRAINT "resolution_chase_paper_id_key" UNIQUE("chase_paper_id");--> statement-breakpoint
CREATE UNIQUE INDEX "instance_link_single_row" ON "instance_link" ((true));--> statement-breakpoint
ALTER TABLE "chase_presence" ADD CONSTRAINT "chase_presence_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;