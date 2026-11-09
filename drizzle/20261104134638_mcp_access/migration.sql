CREATE TYPE "mcp_call_outcome" AS ENUM('OK', 'REFUSED', 'ERROR');--> statement-breakpoint
CREATE TABLE "mcp_audit_entry" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"user_id" text,
	"client_id" text,
	"tool" text NOT NULL,
	"arguments" jsonb NOT NULL,
	"outcome" "mcp_call_outcome" NOT NULL,
	"message" text,
	"duration_ms" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "mcp_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "mcp_audit_entry_conference_id_created_at_idx" ON "mcp_audit_entry" ("conference_id","created_at");--> statement-breakpoint
ALTER TABLE "mcp_audit_entry" ADD CONSTRAINT "mcp_audit_entry_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "mcp_audit_entry" ADD CONSTRAINT "mcp_audit_entry_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;