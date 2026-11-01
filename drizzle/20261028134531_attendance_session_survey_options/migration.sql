CREATE TABLE "attendance_session_to_survey_option" (
	"id" text PRIMARY KEY,
	"a" text NOT NULL,
	"b" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_session_to_survey_option_ab_key" ON "attendance_session_to_survey_option" ("a","b");--> statement-breakpoint
CREATE INDEX "attendance_session_to_survey_option_b_index" ON "attendance_session_to_survey_option" ("b");--> statement-breakpoint
ALTER TABLE "attendance_session_to_survey_option" ADD CONSTRAINT "attendance_session_to_survey_option_aYe8OnIXphBu_fkey" FOREIGN KEY ("a") REFERENCES "attendance_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "attendance_session_to_survey_option" ADD CONSTRAINT "attendance_session_to_survey_option_b_survey_option_id_fkey" FOREIGN KEY ("b") REFERENCES "survey_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;