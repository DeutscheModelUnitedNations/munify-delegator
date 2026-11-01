-- A person takes part in a conference in one way only: as delegation member, single participant,
-- supervisor or on its team. Each table already holds a person once (its unique key on
-- conference_participant_id, or on conference and user for the team); this checks across them.
-- The checks are deferred like `assert_same_conference`, so a step that swaps one part for another
-- (joining a delegation as a single participant, a conversion when applying the assignment) may
-- write in any order within its transaction.
CREATE FUNCTION assert_one_part(conference text, person text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
	-- Two transactions adding a part each would both count only their own at commit. The lock
	-- makes the second wait for the first, then count again and see it.
	PERFORM pg_advisory_xact_lock(hashtextextended('one_part:' || conference || ':' || person, 0));
	IF (
		SELECT count(*) FROM delegation_member m
			JOIN conference_participant p ON p.id = m.conference_participant_id
			WHERE p.conference_id = conference AND p.user_id = person
	) + (
		SELECT count(*) FROM single_participant s
			JOIN conference_participant p ON p.id = s.conference_participant_id
			WHERE p.conference_id = conference AND p.user_id = person
	) + (
		SELECT count(*) FROM conference_supervisor s
			JOIN conference_participant p ON p.id = s.conference_participant_id
			WHERE p.conference_id = conference AND p.user_id = person
	) + (
		SELECT count(*) FROM team_member t WHERE t.conference_id = conference AND t.user_id = person
	) > 1 THEN
		RAISE EXCEPTION 'user % takes part in conference % in more than one way', person, conference
			USING ERRCODE = 'check_violation', CONSTRAINT = 'one_part_per_conference';
	END IF;
END $$;--> statement-breakpoint
-- delegation_member, single_participant and conference_supervisor: the person behind the row. A
-- participant row deleted later in the transaction is skipped, like its part.
CREATE FUNCTION "participant_part_one_part"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
	p record;
BEGIN
	SELECT conference_id, user_id INTO p FROM conference_participant WHERE id = NEW.conference_participant_id;
	IF FOUND THEN
		PERFORM assert_one_part(p.conference_id, p.user_id);
	END IF;
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "delegation_member_one_part" AFTER INSERT OR UPDATE OF "conference_participant_id" ON "delegation_member"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "participant_part_one_part"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "single_participant_one_part" AFTER INSERT OR UPDATE OF "conference_participant_id" ON "single_participant"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "participant_part_one_part"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "conference_supervisor_one_part" AFTER INSERT OR UPDATE OF "conference_participant_id" ON "conference_supervisor"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "participant_part_one_part"();--> statement-breakpoint
-- team_member, and a participant row handed to another user: the row's own conference and user.
CREATE FUNCTION "conference_user_one_part"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_one_part(NEW.conference_id, NEW.user_id);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "team_member_one_part" AFTER INSERT OR UPDATE OF "conference_id", "user_id" ON "team_member"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "conference_user_one_part"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "conference_participant_one_part" AFTER UPDATE OF "user_id" ON "conference_participant"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "conference_user_one_part"();
