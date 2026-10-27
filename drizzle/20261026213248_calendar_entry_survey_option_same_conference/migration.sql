-- A calendar entry shown only to those who picked a survey option has to name an option of its
-- own conference, like its place (`assert_same_conference`, from the `conference_anchor` migration).
CREATE OR REPLACE FUNCTION "calendar_entry_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM calendar_day WHERE id = NEW.calendar_day_id),
		(SELECT conference_id FROM place WHERE id = NEW.place_id),
		(SELECT q.conference_id FROM survey_option o JOIN survey_question q ON q.id = o.question_id
			WHERE o.id = NEW.survey_option_id)
	]);
	RETURN NULL;
END $$;
