-- `assert_same_conference` (the `conference_anchor` migration) checks a row when it is written, so
-- a parent that reaches its conference through a column of its own could still move to another
-- conference and take the rows naming it along: a track moved to a day of another conference keeps
-- its entries, an option moved to another conference's question keeps its answers. Such a link
-- may change within its conference (an entry moves to another day), never out of it. The parents
-- the link points at keep their `conference_id` (`conference_id_is_immutable`), so checking the
-- link is enough.
CREATE FUNCTION reached_conference_is_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
	parent text := TG_ARGV[0];
	link text := TG_ARGV[1];
	before_id text;
	after_id text;
BEGIN
	EXECUTE format('SELECT conference_id FROM %I WHERE id = $1', parent)
		INTO before_id USING to_jsonb(OLD) ->> link;
	EXECUTE format('SELECT conference_id FROM %I WHERE id = $1', parent)
		INTO after_id USING to_jsonb(NEW) ->> link;
	-- a missing parent is the foreign key's to refuse
	IF before_id IS NOT NULL AND after_id IS NOT NULL AND before_id <> after_id THEN
		RAISE EXCEPTION 'the conference of a % row cannot change', TG_TABLE_NAME
			USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_conference_immutable';
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "calendar_entry_conference_immutable" BEFORE UPDATE OF "calendar_day_id" ON "calendar_entry"
	FOR EACH ROW WHEN (OLD."calendar_day_id" IS DISTINCT FROM NEW."calendar_day_id")
	EXECUTE FUNCTION reached_conference_is_immutable('calendar_day', 'calendar_day_id');--> statement-breakpoint
CREATE TRIGGER "calendar_track_conference_immutable" BEFORE UPDATE OF "calendar_day_id" ON "calendar_track"
	FOR EACH ROW WHEN (OLD."calendar_day_id" IS DISTINCT FROM NEW."calendar_day_id")
	EXECUTE FUNCTION reached_conference_is_immutable('calendar_day', 'calendar_day_id');--> statement-breakpoint
CREATE TRIGGER "survey_option_conference_immutable" BEFORE UPDATE OF "question_id" ON "survey_option"
	FOR EACH ROW WHEN (OLD."question_id" IS DISTINCT FROM NEW."question_id")
	EXECUTE FUNCTION reached_conference_is_immutable('survey_question', 'question_id');--> statement-breakpoint
CREATE TRIGGER "committee_agenda_item_conference_immutable" BEFORE UPDATE OF "committee_id" ON "committee_agenda_item"
	FOR EACH ROW WHEN (OLD."committee_id" IS DISTINCT FROM NEW."committee_id")
	EXECUTE FUNCTION reached_conference_is_immutable('committee', 'committee_id');--> statement-breakpoint
CREATE TRIGGER "single_participant_conference_immutable" BEFORE UPDATE OF "conference_participant_id" ON "single_participant"
	FOR EACH ROW WHEN (OLD."conference_participant_id" IS DISTINCT FROM NEW."conference_participant_id")
	EXECUTE FUNCTION reached_conference_is_immutable('conference_participant', 'conference_participant_id');--> statement-breakpoint
CREATE TRIGGER "conference_supervisor_conference_immutable" BEFORE UPDATE OF "conference_participant_id" ON "conference_supervisor"
	FOR EACH ROW WHEN (OLD."conference_participant_id" IS DISTINCT FROM NEW."conference_participant_id")
	EXECUTE FUNCTION reached_conference_is_immutable('conference_participant', 'conference_participant_id');--> statement-breakpoint
CREATE TRIGGER "payment_transaction_conference_immutable" BEFORE UPDATE OF "payer_participant_id" ON "payment_transaction"
	FOR EACH ROW WHEN (OLD."payer_participant_id" IS DISTINCT FROM NEW."payer_participant_id")
	EXECUTE FUNCTION reached_conference_is_immutable('conference_participant', 'payer_participant_id');--> statement-breakpoint

-- The tables `conference_anchor` left out of `conference_id_is_immutable`.
CREATE TRIGGER "conference_email_footer_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "conference_email_footer"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "conference_email_setting_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "conference_email_setting"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "conference_email_text_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "conference_email_text"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "email_log_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "email_log"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();
