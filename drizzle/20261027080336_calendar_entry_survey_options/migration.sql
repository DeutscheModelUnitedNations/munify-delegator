CREATE TABLE "calendar_entry_to_survey_option" (
	"id" text PRIMARY KEY,
	"a" text NOT NULL,
	"b" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_entry_to_survey_option_ab_key" ON "calendar_entry_to_survey_option" ("a","b");--> statement-breakpoint
CREATE INDEX "calendar_entry_to_survey_option_b_index" ON "calendar_entry_to_survey_option" ("b");--> statement-breakpoint
ALTER TABLE "calendar_entry_to_survey_option" ADD CONSTRAINT "calendar_entry_to_survey_option_a_calendar_entry_id_fkey" FOREIGN KEY ("a") REFERENCES "calendar_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_entry_to_survey_option" ADD CONSTRAINT "calendar_entry_to_survey_option_b_survey_option_id_fkey" FOREIGN KEY ("b") REFERENCES "survey_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;