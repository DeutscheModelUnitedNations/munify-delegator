-- Every person takes the school of the application they are in: their own as a single participant,
-- else their delegation's, else the one they named as a supervisor.
UPDATE "conference_participant" AS p
SET "school_id" = coalesce(
	(SELECT s."school_id" FROM "single_participant" s WHERE s."conference_participant_id" = p."id"),
	(SELECT d."school_id"
		FROM "delegation_member" m
		JOIN "delegation" d ON d."id" = m."delegation_id"
		WHERE m."conference_participant_id" = p."id"),
	(SELECT c."school_id" FROM "conference_supervisor" c WHERE c."conference_participant_id" = p."id")
)
WHERE p."school_id" IS NULL;
