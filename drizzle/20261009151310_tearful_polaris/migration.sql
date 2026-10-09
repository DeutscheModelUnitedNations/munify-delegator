CREATE TABLE "attendance_session" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"occasion" text NOT NULL,
	"started_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ended_at" timestamp(3),
	"created_by_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD COLUMN "check_passed" boolean;--> statement-breakpoint
CREATE UNIQUE INDEX "conference_participant_status_conference_id_access_card_id_key" ON "conference_participant_status" ("conference_id","access_card_id");--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD CONSTRAINT "attendance_entry_session_id_attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_session" ADD CONSTRAINT "attendance_session_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;