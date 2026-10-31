CREATE TABLE "school" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text NOT NULL,
	"street" text,
	"apartment" text,
	"zip" text,
	"city" text,
	"region" text,
	"country" text,
	"website" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "max_seats_per_school" integer DEFAULT 16;--> statement-breakpoint
ALTER TABLE "conference_supervisor" ADD COLUMN "school_id" text;--> statement-breakpoint
ALTER TABLE "delegation" ADD COLUMN "school_id" text;--> statement-breakpoint
ALTER TABLE "single_participant" ADD COLUMN "school_id" text;--> statement-breakpoint
ALTER TABLE "waiting_list_entry" ADD COLUMN "school_id" text;--> statement-breakpoint
ALTER TABLE "waiting_list_entry" ADD COLUMN "assigned_at" timestamp(3);--> statement-breakpoint
CREATE INDEX "delegation_school_id_idx" ON "delegation" ("school_id");--> statement-breakpoint
CREATE INDEX "school_name_trgm" ON "school" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "school_city_trgm" ON "school" USING gin ("city" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "single_participant_school_id_idx" ON "single_participant" ("school_id");--> statement-breakpoint
CREATE INDEX "waiting_list_entry_school_id_idx" ON "waiting_list_entry" ("school_id");--> statement-breakpoint
ALTER TABLE "conference_supervisor" ADD CONSTRAINT "conference_supervisor_school_id_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "delegation" ADD CONSTRAINT "delegation_school_id_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "single_participant" ADD CONSTRAINT "single_participant_school_id_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "waiting_list_entry" ADD CONSTRAINT "waiting_list_entry_school_id_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE SET NULL ON UPDATE CASCADE;