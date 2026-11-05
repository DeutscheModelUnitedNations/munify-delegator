-- A person's default view of a table in a conference has to be a view of that conference or a
-- global one (`assert_same_conference`, from the `conference_anchor` migration, skips the null of a
-- global view).
CREATE FUNCTION "table_view_default_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		NEW.conference_id,
		(SELECT conference_id FROM table_view WHERE id = NEW.view_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "table_view_default_same_conference" AFTER INSERT OR UPDATE ON "table_view_default"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "table_view_default_same_conference"();--> statement-breakpoint
-- A view named as someone's default cannot move to another conference under it.
CREATE FUNCTION "table_view_reach_unchanged"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NEW.conference_id IS DISTINCT FROM OLD.conference_id THEN
		RAISE EXCEPTION 'a table_view row cannot change its conference'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'table_view_conference_id_is_immutable';
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "table_view_conference_id_is_immutable" BEFORE UPDATE ON "table_view"
	FOR EACH ROW EXECUTE FUNCTION "table_view_reach_unchanged"();
