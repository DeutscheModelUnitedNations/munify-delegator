-- The survey options a scanner session expects are of the session's conference
-- (`assert_same_conference`, from the `conference_anchor` migration).
CREATE FUNCTION "attendance_session_to_survey_option_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM attendance_session WHERE id = NEW.a),
		(SELECT q.conference_id FROM survey_option o JOIN survey_question q ON q.id = o.question_id WHERE o.id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "attendance_session_to_survey_option_same_conference" AFTER INSERT OR UPDATE ON "attendance_session_to_survey_option"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "attendance_session_to_survey_option_same_conference"();
