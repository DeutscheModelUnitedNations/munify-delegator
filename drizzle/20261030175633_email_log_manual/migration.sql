CREATE TYPE "email_trigger" AS ENUM('AUTOMATIC', 'MANUAL');--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "trigger" "email_trigger" DEFAULT 'AUTOMATIC'::"email_trigger" NOT NULL;--> statement-breakpoint
ALTER TABLE "email_log" ADD COLUMN "sent_by_id" text;--> statement-breakpoint
ALTER TABLE "email_log" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
DROP INDEX "email_log_conference_id_kind_user_id_subject_key_key";--> statement-breakpoint
CREATE UNIQUE INDEX "email_log_conference_id_kind_user_id_subject_key_key" ON "email_log" ("conference_id","kind","user_id","subject_key") WHERE "trigger" = 'AUTOMATIC';--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_sent_by_id_user_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;