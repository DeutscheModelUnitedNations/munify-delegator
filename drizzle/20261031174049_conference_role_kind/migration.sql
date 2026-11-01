-- A role's kind decides who may hold it: delegations hold nations and non-state actors, single
-- participants custom roles, and committees seat nations. Every row naming a role for one of them
-- is checked here, so the resolvers no longer look the role up first. A role's kind never changes,
-- or it would carry the rows naming it past these checks. Existing rows are not checked again.
CREATE FUNCTION assert_role_kind(tbl text, role_id text, kinds conference_role_kind[]) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
	IF role_id IS NOT NULL AND (SELECT kind FROM conference_role WHERE id = role_id) <> ALL (kinds) THEN
		RAISE EXCEPTION 'a % row names a role of the wrong kind', tbl
			USING ERRCODE = 'check_violation', CONSTRAINT = tbl || '_role_kind';
	END IF;
END $$;--> statement-breakpoint

CREATE FUNCTION "delegation_role_kind"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_role_kind(TG_TABLE_NAME, NEW.assigned_role_id, ARRAY['NATION', 'NON_STATE_ACTOR']::conference_role_kind[]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER "delegation_role_kind" AFTER INSERT OR UPDATE OF "assigned_role_id" ON "delegation"
	FOR EACH ROW EXECUTE FUNCTION "delegation_role_kind"();--> statement-breakpoint

CREATE FUNCTION "role_application_role_kind"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_role_kind(TG_TABLE_NAME, NEW.role_id, ARRAY['NATION', 'NON_STATE_ACTOR']::conference_role_kind[]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER "role_application_role_kind" AFTER INSERT OR UPDATE OF "role_id" ON "role_application"
	FOR EACH ROW EXECUTE FUNCTION "role_application_role_kind"();--> statement-breakpoint

-- A unit becomes a delegation when the draft is applied.
CREATE FUNCTION "assignment_unit_role_kind"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_role_kind(TG_TABLE_NAME, NEW.role_id, ARRAY['NATION', 'NON_STATE_ACTOR']::conference_role_kind[]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER "assignment_unit_role_kind" AFTER INSERT OR UPDATE OF "role_id" ON "assignment_unit"
	FOR EACH ROW EXECUTE FUNCTION "assignment_unit_role_kind"();--> statement-breakpoint

CREATE FUNCTION "single_participant_role_kind"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_role_kind(TG_TABLE_NAME, NEW.assigned_role_id, ARRAY['CUSTOM']::conference_role_kind[]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER "single_participant_role_kind" AFTER INSERT OR UPDATE OF "assigned_role_id" ON "single_participant"
	FOR EACH ROW EXECUTE FUNCTION "single_participant_role_kind"();--> statement-breakpoint

-- `a` is the role, `b` the single participant wishing for it.
CREATE FUNCTION "single_participant_role_wish_role_kind"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_role_kind(TG_TABLE_NAME, NEW.a, ARRAY['CUSTOM']::conference_role_kind[]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER "single_participant_role_wish_role_kind" AFTER INSERT OR UPDATE OF "a" ON "single_participant_role_wish"
	FOR EACH ROW EXECUTE FUNCTION "single_participant_role_wish_role_kind"();--> statement-breakpoint

CREATE FUNCTION "assignment_single_role_role_kind"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_role_kind(TG_TABLE_NAME, NEW.role_id, ARRAY['CUSTOM']::conference_role_kind[]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER "assignment_single_role_role_kind" AFTER INSERT OR UPDATE OF "role_id" ON "assignment_single_role"
	FOR EACH ROW EXECUTE FUNCTION "assignment_single_role_role_kind"();--> statement-breakpoint

-- Committees seat nations only; `a` is the committee, `b` the role.
CREATE FUNCTION "committee_to_role_role_kind"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_role_kind(TG_TABLE_NAME, NEW.b, ARRAY['NATION']::conference_role_kind[]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER "committee_to_role_role_kind" AFTER INSERT OR UPDATE OF "b" ON "committee_to_role"
	FOR EACH ROW EXECUTE FUNCTION "committee_to_role_role_kind"();--> statement-breakpoint

CREATE FUNCTION "conference_role_kind_immutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	RAISE EXCEPTION 'the kind of a conference_role row cannot change'
		USING ERRCODE = 'check_violation', CONSTRAINT = 'conference_role_kind_immutable';
END $$;--> statement-breakpoint
CREATE TRIGGER "conference_role_kind_immutable" BEFORE UPDATE OF "kind" ON "conference_role"
	FOR EACH ROW WHEN (OLD."kind" IS DISTINCT FROM NEW."kind")
	EXECUTE FUNCTION "conference_role_kind_immutable"();
