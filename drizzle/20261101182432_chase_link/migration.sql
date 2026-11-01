CREATE TYPE "chase_access" AS ENUM('SPECTATOR', 'TEAM', 'NONE');--> statement-breakpoint
CREATE TYPE "instance_link_status" AS ENUM('PENDING', 'ACTIVE', 'FROZEN');--> statement-breakpoint
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
ALTER TABLE "conference_role" ADD COLUMN "chase_access" "chase_access" DEFAULT 'SPECTATOR'::"chase_access" NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "instance_link_single_row" ON "instance_link" ((true));