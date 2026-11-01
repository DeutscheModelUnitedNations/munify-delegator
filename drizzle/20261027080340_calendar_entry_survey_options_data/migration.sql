-- A calendar entry can be limited to several survey options instead of one: every entry naming
-- an option keeps it as its first row of `calendar_entry_to_survey_option`, which takes over the
-- same-conference check (`assert_same_conference`, from the `conference_anchor` migration) the
-- entry's own trigger did for `survey_option_id`. The next migration drops that column.
INSERT INTO "calendar_entry_to_survey_option" ("id", "a", "b")
	SELECT gen_random_uuid()::text, "id", "survey_option_id" FROM "calendar_entry"
	WHERE "survey_option_id" IS NOT NULL;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "calendar_entry_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM calendar_day WHERE id = NEW.calendar_day_id),
		(SELECT conference_id FROM place WHERE id = NEW.place_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE FUNCTION "calendar_entry_to_survey_option_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT x.conference_id FROM calendar_entry c JOIN calendar_day x ON x.id = c.calendar_day_id WHERE c.id = NEW.a),
		(SELECT q.conference_id FROM survey_option o JOIN survey_question q ON q.id = o.question_id WHERE o.id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "calendar_entry_to_survey_option_same_conference" AFTER INSERT OR UPDATE ON "calendar_entry_to_survey_option"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "calendar_entry_to_survey_option_same_conference"();
