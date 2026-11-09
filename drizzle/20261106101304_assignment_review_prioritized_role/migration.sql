ALTER TABLE "assignment_review" ADD COLUMN "prioritized_role_id" text;--> statement-breakpoint
ALTER TABLE "assignment_review" ADD CONSTRAINT "assignment_review_prioritized_role_id_conference_role_id_fkey" FOREIGN KEY ("prioritized_role_id") REFERENCES "conference_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
-- The prioritized role has to be of the review's conference too.
CREATE OR REPLACE FUNCTION "assignment_review_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		NEW.conference_id,
		(SELECT conference_id FROM delegation WHERE id = NEW.delegation_id),
		(SELECT x.conference_id FROM single_participant c JOIN conference_participant x ON x.id = c.conference_participant_id WHERE c.id = NEW.single_participant_id),
		(SELECT conference_id FROM conference_role WHERE id = NEW.prioritized_role_id)
	]);
	RETURN NULL;
END $$;
