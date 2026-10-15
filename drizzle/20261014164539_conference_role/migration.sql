-- Nations, non-state actors and custom roles become rows of one `conference_role` table, so a
-- role is one foreign key wherever it is used. Non-state actors and custom roles keep their ids;
-- a nation gets one row per conference that seats it (or that already holds it somewhere).
-- The statistics views read the old columns, so they are dropped first and rebuilt at the end.

CREATE TYPE "conference_role_kind" AS ENUM('NATION', 'NON_STATE_ACTOR', 'CUSTOM');--> statement-breakpoint
CREATE TABLE "conference_role" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"kind" "conference_role_kind" NOT NULL,
	"nation_alpha3_code" text,
	"name" text,
	"abbreviation" text,
	"description" text,
	"font_awesome_icon" text,
	"seat_amount" integer,
	CONSTRAINT "conference_role_nation_shape" CHECK (("kind" = 'NATION') = ("nation_alpha3_code" is not null)
				and ("kind" = 'NATION') = ("name" is null)
				and ("kind" = 'NATION') = ("description" is null)
				and ("kind" = 'NATION') = ("seat_amount" is null)),
	CONSTRAINT "conference_role_abbreviation" CHECK (("kind" = 'NON_STATE_ACTOR') = ("abbreviation" is not null))
);
--> statement-breakpoint
CREATE TABLE "committee_to_role" (
	"id" text PRIMARY KEY,
	"a" text NOT NULL,
	"b" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "single_participant_role_wish" (
	"id" text PRIMARY KEY,
	"a" text NOT NULL,
	"b" text NOT NULL
);
--> statement-breakpoint

-- ---- The roles -------------------------------------------------------------------------
INSERT INTO "conference_role" (
	"id", "created_at", "updated_at", "conference_id", "kind", "name", "abbreviation",
	"description", "font_awesome_icon", "seat_amount"
)
SELECT
	"id", "created_at", "updated_at", "conference_id", 'NON_STATE_ACTOR', "name", "abbreviation",
	"description", "font_awesome_icon", "seat_amount"
FROM "non_state_actor";--> statement-breakpoint
INSERT INTO "conference_role" (
	"id", "created_at", "updated_at", "conference_id", "kind", "name", "description",
	"font_awesome_icon", "seat_amount"
)
SELECT
	"id", "created_at", "updated_at", "conference_id", 'CUSTOM', "name", "description",
	"font_awesome_icon", "seat_amount"
FROM "custom_conference_role";--> statement-breakpoint
-- Every nation a conference seats, holds, is wished for or is planned for in the draft.
INSERT INTO "conference_role" ("id", "conference_id", "kind", "nation_alpha3_code")
SELECT DISTINCT
	'nation-' || md5(n.conference_id || ':' || n.alpha3_code), n.conference_id, 'NATION'::conference_role_kind, n.alpha3_code
FROM (
	SELECT c."conference_id", cn."b" AS alpha3_code
	FROM "committee_to_nation" cn
	JOIN "committee" c ON c."id" = cn."a"
	UNION
	SELECT "conference_id", "assigned_nation_alpha3_code"
	FROM "delegation"
	WHERE "assigned_nation_alpha3_code" IS NOT NULL
	UNION
	SELECT d."conference_id", ra."nation_id"
	FROM "role_application" ra
	JOIN "delegation" d ON d."id" = ra."delegation_id"
	WHERE ra."nation_id" IS NOT NULL
	UNION
	SELECT "conference_id", "nation_alpha3_code"
	FROM "assignment_unit"
	WHERE "nation_alpha3_code" IS NOT NULL
) n;--> statement-breakpoint
INSERT INTO "committee_to_role" ("id", "a", "b")
SELECT cn."id", cn."a", 'nation-' || md5(c."conference_id" || ':' || cn."b")
FROM "committee_to_nation" cn
JOIN "committee" c ON c."id" = cn."a";--> statement-breakpoint
INSERT INTO "single_participant_role_wish" ("id", "a", "b")
SELECT "id", "a", "b" FROM "custom_conference_role_to_single_participant";--> statement-breakpoint

-- ---- Views reading the old columns -----------------------------------------------------
-- Drops statistics_people, _registration_days, _ages, _addresses and _participant_status with it.
DROP VIEW "statistics_participation" CASCADE;--> statement-breakpoint
DROP MATERIALIZED VIEW "statistics_delegations";--> statement-breakpoint
DROP MATERIALIZED VIEW "statistics_role_applications";--> statement-breakpoint
DROP MATERIALIZED VIEW "statistics_committee_fill";--> statement-breakpoint

-- ---- The references --------------------------------------------------------------------
ALTER TABLE "delegation" ADD COLUMN "assigned_role_id" text;--> statement-breakpoint
UPDATE "delegation"
SET "assigned_role_id" = coalesce(
	"assigned_non_state_actor_id",
	'nation-' || md5("conference_id" || ':' || "assigned_nation_alpha3_code")
)
WHERE "assigned_non_state_actor_id" IS NOT NULL OR "assigned_nation_alpha3_code" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "role_application" ADD COLUMN "role_id" text;--> statement-breakpoint
UPDATE "role_application" ra
SET "role_id" = coalesce(
	ra."non_state_actor_id",
	'nation-' || md5(d."conference_id" || ':' || ra."nation_id")
)
FROM "delegation" d
WHERE d."id" = ra."delegation_id";--> statement-breakpoint
-- A wish whose role was deleted (the old foreign keys set it to null) wishes for nothing.
DELETE FROM "role_application" WHERE "role_id" IS NULL;--> statement-breakpoint
ALTER TABLE "role_application" ALTER COLUMN "role_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assignment_unit" ADD COLUMN "role_id" text;--> statement-breakpoint
UPDATE "assignment_unit"
SET "role_id" = coalesce(
	"non_state_actor_id",
	'nation-' || md5("conference_id" || ':' || "nation_alpha3_code")
)
WHERE "non_state_actor_id" IS NOT NULL OR "nation_alpha3_code" IS NOT NULL;--> statement-breakpoint

-- ---- The old columns and tables --------------------------------------------------------
-- The keys staying in place are dropped by column: databases migrated from the Prisma era name
-- them differently from ones built from the baseline. Indexes and keys on the dropped columns go
-- with them.
DO $$
DECLARE fk record;
BEGIN
	FOR fk IN
		SELECT con.conname FROM pg_constraint con
		JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
		WHERE con.conrelid = '"assignment_single_role"'::regclass AND con.contype = 'f' AND att.attname = 'role_id'
	LOOP
		EXECUTE format('ALTER TABLE "assignment_single_role" DROP CONSTRAINT %I', fk.conname);
	END LOOP;
END $$;--> statement-breakpoint
DO $$
DECLARE fk record;
BEGIN
	FOR fk IN
		SELECT con.conname FROM pg_constraint con
		JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
		WHERE con.conrelid = '"single_participant"'::regclass AND con.contype = 'f' AND att.attname = 'assigned_role_id'
	LOOP
		EXECUTE format('ALTER TABLE "single_participant" DROP CONSTRAINT %I', fk.conname);
	END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "assignment_unit" DROP CONSTRAINT IF EXISTS "assignment_unit_one_role";--> statement-breakpoint
ALTER TABLE "assignment_unit" DROP COLUMN "nation_alpha3_code";--> statement-breakpoint
ALTER TABLE "assignment_unit" DROP COLUMN "non_state_actor_id";--> statement-breakpoint
ALTER TABLE "delegation" DROP COLUMN "assigned_nation_alpha3_code";--> statement-breakpoint
ALTER TABLE "delegation" DROP COLUMN "assigned_non_state_actor_id";--> statement-breakpoint
ALTER TABLE "role_application" DROP COLUMN "nation_id";--> statement-breakpoint
ALTER TABLE "role_application" DROP COLUMN "non_state_actor_id";--> statement-breakpoint
DROP TABLE "committee_to_nation";--> statement-breakpoint
DROP TABLE "custom_conference_role_to_single_participant";--> statement-breakpoint
DROP TABLE "custom_conference_role";--> statement-breakpoint
DROP TABLE "non_state_actor";--> statement-breakpoint

-- ---- Indexes and foreign keys ----------------------------------------------------------
CREATE UNIQUE INDEX "committee_to_role_ab_key" ON "committee_to_role" ("a","b");--> statement-breakpoint
CREATE INDEX "committee_to_role_b_index" ON "committee_to_role" ("b");--> statement-breakpoint
CREATE INDEX "conference_role_conference_id_idx" ON "conference_role" ("conference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "conference_role_conference_id_nation_alpha3_code_key" ON "conference_role" ("conference_id","nation_alpha3_code");--> statement-breakpoint
CREATE UNIQUE INDEX "conference_role_conference_id_kind_name_key" ON "conference_role" ("conference_id","kind","name");--> statement-breakpoint
CREATE UNIQUE INDEX "conference_role_conference_id_abbreviation_key" ON "conference_role" ("conference_id","abbreviation");--> statement-breakpoint
CREATE UNIQUE INDEX "delegation_assigned_role_id_key" ON "delegation" ("assigned_role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_application_delegation_id_role_id_key" ON "role_application" ("delegation_id","role_id");--> statement-breakpoint
CREATE INDEX "role_application_role_id_idx" ON "role_application" ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "single_participant_role_wish_ab_key" ON "single_participant_role_wish" ("a","b");--> statement-breakpoint
CREATE INDEX "single_participant_role_wish_b_index" ON "single_participant_role_wish" ("b");--> statement-breakpoint
ALTER TABLE "assignment_single_role" ADD CONSTRAINT "assignment_single_role_role_id_conference_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "conference_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_unit" ADD CONSTRAINT "assignment_unit_role_id_conference_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "conference_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "committee_to_role" ADD CONSTRAINT "committee_to_role_a_committee_id_fkey" FOREIGN KEY ("a") REFERENCES "committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "committee_to_role" ADD CONSTRAINT "committee_to_role_b_conference_role_id_fkey" FOREIGN KEY ("b") REFERENCES "conference_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference_role" ADD CONSTRAINT "conference_role_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference_role" ADD CONSTRAINT "conference_role_nation_alpha3_code_nation_alpha3_code_fkey" FOREIGN KEY ("nation_alpha3_code") REFERENCES "nation"("alpha3_code") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "delegation" ADD CONSTRAINT "delegation_assigned_role_id_conference_role_id_fkey" FOREIGN KEY ("assigned_role_id") REFERENCES "conference_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "role_application" ADD CONSTRAINT "role_application_role_id_conference_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "conference_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "single_participant" ADD CONSTRAINT "single_participant_assigned_role_id_conference_role_id_fkey" FOREIGN KEY ("assigned_role_id") REFERENCES "conference_role"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "single_participant_role_wish" ADD CONSTRAINT "single_participant_role_wish_a_conference_role_id_fkey" FOREIGN KEY ("a") REFERENCES "conference_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "single_participant_role_wish" ADD CONSTRAINT "single_participant_role_wish_b_single_participant_id_fkey" FOREIGN KEY ("b") REFERENCES "single_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint

-- ---- The statistics views, as before but reading `assigned_role_id` ---------------------
-- See `statistics_materialized_views` for what each one is for.
CREATE VIEW "statistics_participation" AS
WITH supervised AS (
	SELECT
		j.a AS supervisor_id,
		d.applied,
		d.assigned_role_id IS NOT NULL AS has_role
	FROM conference_supervisor_to_delegation_member j
	JOIN delegation_member dm ON dm.id = j.b
	JOIN delegation d ON d.id = dm.delegation_id
	UNION ALL
	SELECT j.a, sp.applied, sp.assigned_role_id IS NOT NULL
	FROM conference_supervisor_to_single_participant j
	JOIN single_participant sp ON sp.id = j.b
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

CREATE MATERIALIZED VIEW "statistics_delegations" AS
SELECT
	d.conference_id,
	d.applied,
	d.assigned_role_id IS NOT NULL AS has_role,
	d.school,
	count(*)::int AS delegations,
	coalesce(sum(
		(SELECT count(*) FROM delegation_member dm WHERE dm.delegation_id = d.id)
	), 0)::int AS members
FROM delegation d
GROUP BY 1, 2, 3, 4
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_delegations_key" ON "statistics_delegations" (
	"conference_id", "applied", "has_role", "school"
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

CREATE MATERIALIZED VIEW "statistics_role_applications" AS
SELECT
	r.conference_id,
	r.id AS role_id,
	r.name,
	r.font_awesome_icon,
	count(sp.id)::int AS total,
	(count(sp.id) FILTER (WHERE sp.applied))::int AS applied
FROM conference_role r
LEFT JOIN single_participant_role_wish j ON j.a = r.id
LEFT JOIN single_participant sp ON sp.id = j.b
WHERE r.kind = 'CUSTOM'
GROUP BY r.id
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_role_applications_key"
	ON "statistics_role_applications" ("role_id");--> statement-breakpoint

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
	FROM conference_participant_status s
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
) NULLS NOT DISTINCT;--> statement-breakpoint

CREATE MATERIALIZED VIEW "statistics_committee_fill" AS
SELECT
	c.conference_id,
	c.id AS committee_id,
	c.name,
	c.abbreviation,
	((SELECT count(*) FROM committee_to_role cr WHERE cr.a = c.id)
		* c.num_of_seats_per_delegation)::int AS total_seats,
	(
		SELECT count(*)
		FROM delegation_member dm
		JOIN delegation d ON d.id = dm.delegation_id
		WHERE dm.assigned_committee_id = c.id AND d.applied
	)::int AS assigned_seats
FROM committee c
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_committee_fill_key" ON "statistics_committee_fill" ("committee_id");
