CREATE TYPE "email_kind" AS ENUM('ASSIGNMENT_ACCEPTED', 'ASSIGNMENT_REJECTED', 'SUPERVISOR_ASSIGNMENT_SUMMARY', 'WAITING_LIST_SEATED', 'POSTAL_UNLOCKED', 'PAYMENT_UNLOCKED', 'POSTAL_RECEIVED', 'PAYMENT_RECEIVED', 'PAPERWORK_PROBLEM', 'APPLICATION_DEADLINE_REMINDER', 'OPEN_ISSUES_REMINDER', 'PHONE_READY_REMINDER', 'CERTIFICATE_AVAILABLE', 'SUPERVISOR_STUDENT_LINKED');--> statement-breakpoint
CREATE TYPE "email_status" AS ENUM('SENDING', 'SENT', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TABLE "conference_email_setting" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"kind" "email_kind" NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"kind" "email_kind" NOT NULL,
	"user_id" text NOT NULL,
	"subject_key" text NOT NULL,
	"status" "email_status" DEFAULT 'SENDING'::"email_status" NOT NULL,
	"email" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"sent_at" timestamp(3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "conference_email_setting_conference_id_kind_key" ON "conference_email_setting" ("conference_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "email_log_conference_id_kind_user_id_subject_key_key" ON "email_log" ("conference_id","kind","user_id","subject_key");--> statement-breakpoint
CREATE INDEX "email_log_conference_id_created_at_idx" ON "email_log" ("conference_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "conference_email_setting" ADD CONSTRAINT "conference_email_setting_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;