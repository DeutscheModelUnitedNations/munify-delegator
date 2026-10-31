-- A delegation member reaches its conference through its participant row (and its delegation, which
-- `delegation_member_same_conference` keeps in step), and draft rows name it
-- (`assignment_unit_member`). Changing participant row and delegation together in one write passed
-- every check and carried the draft rows into another conference. Like the parents in
-- `conference_reach_unchanged`, the link may change within its conference, never out of it.
CREATE TRIGGER "delegation_member_conference_immutable" BEFORE UPDATE OF "conference_participant_id" ON "delegation_member"
	FOR EACH ROW WHEN (OLD."conference_participant_id" IS DISTINCT FROM NEW."conference_participant_id")
	EXECUTE FUNCTION reached_conference_is_immutable('conference_participant', 'conference_participant_id');
