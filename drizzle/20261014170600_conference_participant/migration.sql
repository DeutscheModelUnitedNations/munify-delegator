-- `conference_participant_status` becomes `conference_participant`: every person with a part in a
-- conference gets a row from their first registration on, the registrations point at it, and
-- supervision links people (`supervision`) instead of their delegation memberships or single
-- registrations, so a supervisor keeps a student however the registration changes. The
-- statistics views reading the old link tables are rebuilt at the end.

ALTER TABLE "conference_participant_status" RENAME TO "conference_participant";--> statement-breakpoint
-- Keys and indexes are renamed by what they are rather than by name: databases migrated from the
-- Prisma era name them differently from ones built from the baseline.
DO $$
DECLARE pk record;
BEGIN
	FOR pk IN
		SELECT conname FROM pg_constraint
		WHERE conrelid = '"conference_participant"'::regclass AND contype = 'p'
	LOOP
		EXECUTE format('ALTER TABLE "conference_participant" RENAME CONSTRAINT %I TO "conference_participant_pkey"', pk.conname);
	END LOOP;
END $$;--> statement-breakpoint
DO $$
DECLARE fk record;
BEGIN
	FOR fk IN
		SELECT con.conname FROM pg_constraint con
		JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
		WHERE con.conrelid = '"conference_participant"'::regclass AND con.contype = 'f' AND att.attname = 'user_id'
	LOOP
		EXECUTE format('ALTER TABLE "conference_participant" RENAME CONSTRAINT %I TO "conference_participant_user_id_user_id_fkey"', fk.conname);
	END LOOP;
END $$;--> statement-breakpoint
DO $$
DECLARE fk record;
BEGIN
	FOR fk IN
		SELECT con.conname FROM pg_constraint con
		JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
		WHERE con.conrelid = '"conference_participant"'::regclass AND con.contype = 'f' AND att.attname = 'conference_id'
	LOOP
		EXECUTE format('ALTER TABLE "conference_participant" RENAME CONSTRAINT %I TO "conference_participant_conference_id_conference_id_fkey"', fk.conname);
	END LOOP;
END $$;--> statement-breakpoint
ALTER INDEX IF EXISTS "conference_participant_status_conference_id_doc_number_key" RENAME TO "conference_participant_conference_id_doc_number_key";--> statement-breakpoint
ALTER INDEX IF EXISTS "conference_participant_status_conference_id_access_card_id_key" RENAME TO "conference_participant_conference_id_access_card_id_key";--> statement-breakpoint
ALTER INDEX IF EXISTS "conference_participant_status_user_id_conference_id_key" RENAME TO "conference_participant_user_id_conference_id_key";--> statement-breakpoint
ALTER TABLE "attendance_entry" RENAME COLUMN "conference_participant_status_id" TO "conference_participant_id";--> statement-breakpoint
DO $$
DECLARE fk record;
BEGIN
	FOR fk IN
		SELECT con.conname FROM pg_constraint con
		JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
		WHERE con.conrelid = '"attendance_entry"'::regclass AND con.contype = 'f' AND att.attname = 'conference_participant_id'
	LOOP
		EXECUTE format('ALTER TABLE "attendance_entry" RENAME CONSTRAINT %I TO "attendance_entry_EGNGYo8NEZis_fkey"', fk.conname);
	END LOOP;
END $$;--> statement-breakpoint

-- ---- A row for everyone taking part ----------------------------------------------------
INSERT INTO "conference_participant" ("id", "conference_id", "user_id")
SELECT 'cp-' || md5(p.conference_id || ':' || p.user_id), p.conference_id, p.user_id
FROM (
	SELECT "conference_id", "user_id" FROM "delegation_member"
	UNION
	SELECT "conference_id", "user_id" FROM "single_participant"
	UNION
	SELECT "conference_id", "user_id" FROM "conference_supervisor"
) p
ON CONFLICT ("user_id", "conference_id") DO NOTHING;--> statement-breakpoint

ALTER TABLE "delegation_member" ADD COLUMN "conference_participant_id" text;--> statement-breakpoint
ALTER TABLE "single_participant" ADD COLUMN "conference_participant_id" text;--> statement-breakpoint
ALTER TABLE "conference_supervisor" ADD COLUMN "conference_participant_id" text;--> statement-breakpoint
UPDATE "delegation_member" r SET "conference_participant_id" = p."id"
FROM "conference_participant" p WHERE p."conference_id" = r."conference_id" AND p."user_id" = r."user_id";--> statement-breakpoint
UPDATE "single_participant" r SET "conference_participant_id" = p."id"
FROM "conference_participant" p WHERE p."conference_id" = r."conference_id" AND p."user_id" = r."user_id";--> statement-breakpoint
UPDATE "conference_supervisor" r SET "conference_participant_id" = p."id"
FROM "conference_participant" p WHERE p."conference_id" = r."conference_id" AND p."user_id" = r."user_id";--> statement-breakpoint
ALTER TABLE "delegation_member" ALTER COLUMN "conference_participant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "single_participant" ALTER COLUMN "conference_participant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "conference_supervisor" ALTER COLUMN "conference_participant_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "conference_supervisor_conference_participant_id_key" ON "conference_supervisor" ("conference_participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delegation_member_conference_participant_id_key" ON "delegation_member" ("conference_participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "single_participant_conference_participant_id_key" ON "single_participant" ("conference_participant_id");--> statement-breakpoint
ALTER TABLE "conference_supervisor" ADD CONSTRAINT "conference_supervisor_ft27LIKO7Dw5_fkey" FOREIGN KEY ("conference_participant_id") REFERENCES "conference_participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "delegation_member" ADD CONSTRAINT "delegation_member_mwnnuUZrif7B_fkey" FOREIGN KEY ("conference_participant_id") REFERENCES "conference_participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "single_participant" ADD CONSTRAINT "single_participant_jibra4193PXK_fkey" FOREIGN KEY ("conference_participant_id") REFERENCES "conference_participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint

-- ---- Supervision -----------------------------------------------------------------------
CREATE TABLE "supervision" (
	"id" text PRIMARY KEY,
	"a" text NOT NULL,
	"b" text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "supervision_ab_key" ON "supervision" ("a","b");--> statement-breakpoint
CREATE INDEX "supervision_b_index" ON "supervision" ("b");--> statement-breakpoint
INSERT INTO "supervision" ("id", "a", "b")
SELECT j."id", j."a", dm."conference_participant_id"
FROM "conference_supervisor_to_delegation_member" j
JOIN "delegation_member" dm ON dm."id" = j."b"
UNION ALL
SELECT j."id", j."a", sp."conference_participant_id"
FROM "conference_supervisor_to_single_participant" j
JOIN "single_participant" sp ON sp."id" = j."b"
ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "supervision" ADD CONSTRAINT "supervision_a_conference_supervisor_id_fkey" FOREIGN KEY ("a") REFERENCES "conference_supervisor"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "supervision" ADD CONSTRAINT "supervision_b_conference_participant_id_fkey" FOREIGN KEY ("b") REFERENCES "conference_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint

-- ---- The statistics views reading the old link tables ----------------------------------
-- Drops statistics_people, _registration_days, _ages, _addresses and _participant_status with it.
DROP VIEW "statistics_participation" CASCADE;--> statement-breakpoint
DROP TABLE "conference_supervisor_to_delegation_member";--> statement-breakpoint
DROP TABLE "conference_supervisor_to_single_participant";--> statement-breakpoint

-- As `conference_role` left them, but supervision read from `supervision`.
CREATE VIEW "statistics_participation" AS
WITH supervised AS (
	SELECT
		s.a AS supervisor_id,
		coalesce(d.applied, sp.applied) AS applied,
		coalesce(d.assigned_role_id, sp.assigned_role_id) IS NOT NULL AS has_role
	FROM supervision s
	LEFT JOIN delegation_member dm ON dm.conference_participant_id = s.b
	LEFT JOIN delegation d ON d.id = dm.delegation_id
	LEFT JOIN single_participant sp ON sp.conference_participant_id = s.b
	-- a supervised person who holds no registration (any more) counts for nothing
	WHERE dm.id IS NOT NULL OR sp.id IS NOT NULL
)
SELECT
	dm.conference_id,
	'DELEGATION_MEMBER' AS kind,
	dm.user_id,
	dm.created_at,
	d.applied,
	d.assigned_role_id IS NOT NULL AS has_role,
	coalesce(r.kind = 'NATION', false) AS has_nation,
	coalesce(r.kind = 'NON_STATE_ACTOR', false) AS has_non_state_actor,
	dm.assigned_committee_id,
	NULL::text AS assigned_role_id,
	false AS accepted,
	true AS attends
FROM delegation_member dm
JOIN delegation d ON d.id = dm.delegation_id
LEFT JOIN conference_role r ON r.id = d.assigned_role_id
UNION ALL
SELECT
	sp.conference_id,
	'SINGLE_PARTICIPANT',
	sp.user_id,
	sp.created_at,
	sp.applied,
	sp.assigned_role_id IS NOT NULL,
	false,
	false,
	NULL,
	sp.assigned_role_id,
	false,
	true
FROM single_participant sp
UNION ALL
SELECT
	cs.conference_id,
	'SUPERVISOR',
	cs.user_id,
	cs.created_at,
	coalesce(bool_or(s.applied), false),
	coalesce(bool_or(s.applied AND s.has_role), false),
	false,
	false,
	NULL,
	NULL,
	coalesce(bool_or(s.has_role), false),
	cs.plans_own_attendence_at_conference
FROM conference_supervisor cs
LEFT JOIN supervised s ON s.supervisor_id = cs.id
GROUP BY cs.id
UNION ALL
SELECT
	tm.conference_id,
	'TEAM_MEMBER',
	tm.user_id,
	tm.created_at,
	false,
	false,
	false,
	false,
	NULL,
	NULL,
	false,
	true
FROM team_member tm;--> statement-breakpoint

CREATE MATERIALIZED VIEW "statistics_people" AS
SELECT
	p.conference_id,
	p.kind,
	p.applied,
	p.has_role,
	p.has_nation,
	p.assigned_committee_id IS NOT NULL AS has_committee,
	p.accepted,
	p.attends,
	u.gender,
	u.food_preference,
	count(*)::int AS count
FROM statistics_participation p
JOIN "user" u ON u.id = p.user_id
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_people_key" ON "statistics_people" (
	"conference_id", "kind", "applied", "has_role", "has_nation", "has_committee", "accepted",
	"attends", "gender", "food_preference"
) NULLS NOT DISTINCT;--> statement-breakpoint

CREATE MATERIALIZED VIEW "statistics_registration_days" AS
WITH registrations AS (
	SELECT
		d.conference_id,
		'DELEGATION' AS kind,
		d.created_at,
		d.applied,
		d.assigned_role_id IS NOT NULL AS has_role,
		(SELECT count(*) FROM delegation_member dm WHERE dm.delegation_id = d.id) AS members
	FROM delegation d
	UNION ALL
	SELECT conference_id, kind, created_at, applied, has_role, 0
	FROM statistics_participation
	WHERE kind IN ('SINGLE_PARTICIPANT', 'SUPERVISOR')
)
SELECT
	conference_id,
	created_at::date AS day,
	kind,
	applied,
	has_role,
	count(*)::int AS registrations,
	sum(members)::int AS members
FROM registrations
GROUP BY 1, 2, 3, 4, 5
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_registration_days_key" ON "statistics_registration_days" (
	"conference_id", "day", "kind", "applied", "has_role"
);--> statement-breakpoint

CREATE MATERIALIZED VIEW "statistics_ages" AS
WITH categorized AS (
	SELECT
		p.conference_id,
		p.user_id,
		p.applied,
		p.has_role,
		CASE
			WHEN p.kind = 'SINGLE_PARTICIPANT' AND p.assigned_role_id IS NOT NULL
				THEN 'role_' || p.assigned_role_id
			WHEN p.kind = 'SINGLE_PARTICIPANT' THEN 'unassigned'
			WHEN p.has_nation THEN 'nationDelegates'
			WHEN p.has_non_state_actor THEN 'nsaParticipants'
			ELSE 'unassignedDelegationMembers'
		END AS category_id,
		CASE WHEN p.kind = 'SINGLE_PARTICIPANT' THEN 'singleParticipant' ELSE 'delegationMember' END
			AS category_type,
		r.name AS role_name,
		CASE WHEN p.has_nation THEN p.assigned_committee_id END AS committee_id
	FROM statistics_participation p
	LEFT JOIN conference_role r ON r.id = p.assigned_role_id
	WHERE p.kind IN ('DELEGATION_MEMBER', 'SINGLE_PARTICIPANT')
)
SELECT
	c.conference_id,
	c.category_id,
	c.category_type,
	c.role_name,
	c.committee_id,
	co.name AS committee_name,
	co.abbreviation AS committee_abbreviation,
	c.applied,
	c.has_role,
	date_part('year', age(conf.end_conference::date, u.birthday::date))::int AS age,
	count(*)::int AS count
FROM categorized c
JOIN conference conf ON conf.id = c.conference_id
JOIN "user" u ON u.id = c.user_id
LEFT JOIN committee co ON co.id = c.committee_id
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_ages_key" ON "statistics_ages" (
	"conference_id", "category_id", "committee_id", "applied", "has_role", "age"
) NULLS NOT DISTINCT;--> statement-breakpoint

CREATE MATERIALIZED VIEW "statistics_addresses" AS
SELECT
	p.conference_id,
	p.applied,
	p.has_role,
	u.country,
	left(u.zip, 3) AS zip_prefix,
	count(*)::int AS count
FROM statistics_participation p
JOIN "user" u ON u.id = p.user_id
WHERE p.kind IN ('DELEGATION_MEMBER', 'SINGLE_PARTICIPANT')
GROUP BY 1, 2, 3, 4, 5
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_addresses_key" ON "statistics_addresses" (
	"conference_id", "applied", "has_role", "country", "zip_prefix"
) NULLS NOT DISTINCT;--> statement-breakpoint

CREATE MATERIALIZED VIEW "statistics_participant_status" AS
WITH expected AS (
	SELECT DISTINCT conference_id, user_id
	FROM statistics_participation
	WHERE (kind IN ('DELEGATION_MEMBER', 'SINGLE_PARTICIPANT') AND has_role)
		OR (kind = 'SUPERVISOR' AND attends)
),
statuses AS (
	SELECT
		coalesce(s.conference_id, e.conference_id) AS conference_id,
		coalesce(s.user_id, e.user_id) AS user_id,
		e.user_id IS NOT NULL AS expected,
		s.id IS NOT NULL AS has_status,
		s.payment_status,
		s.terms_and_conditions,
		s.guardian_consent,
		s.media_consent,
		coalesce(s.did_attend, false) AS did_attend
	FROM conference_participant s
	FULL JOIN expected e ON e.conference_id = s.conference_id AND e.user_id = s.user_id
),
judged AS (
	SELECT
		st.*,
		coalesce(
			date_part('year', age(conf.start_conference::date, u.birthday::date)) >= 18,
			false
		) AS of_age
	FROM statuses st
	JOIN conference conf ON conf.id = st.conference_id
	JOIN "user" u ON u.id = st.user_id
)
SELECT
	conference_id,
	expected,
	has_status,
	payment_status,
	coalesce(
		terms_and_conditions = 'DONE' AND (of_age OR guardian_consent = 'DONE')
			AND media_consent = 'DONE',
		false
	) AS postal_done,
	coalesce(
		terms_and_conditions = 'PROBLEM' OR (NOT of_age AND guardian_consent = 'PROBLEM')
			OR media_consent = 'PROBLEM',
		false
	) AS postal_problem,
	did_attend,
	count(*)::int AS count
FROM judged
GROUP BY 1, 2, 3, 4, 5, 6, 7
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_participant_status_key" ON "statistics_participant_status" (
	"conference_id", "expected", "has_status", "payment_status", "postal_done", "postal_problem",
	"did_attend"
) NULLS NOT DISTINCT;
