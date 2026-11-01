-- A school is kept for people only: `conference_participant.school_id` (and the waiting list
-- entry, for people who have no participant row yet). Delegations, single participants and
-- supervisors lose their own column. Everybody without a school of their own first takes the one
-- their registration named: their own single or supervisor registration, else their delegation's.
UPDATE conference_participant cp SET school_id = sp.school_id
FROM single_participant sp
WHERE sp.conference_participant_id = cp.id AND cp.school_id IS NULL AND sp.school_id IS NOT NULL;--> statement-breakpoint
UPDATE conference_participant cp SET school_id = cs.school_id
FROM conference_supervisor cs
WHERE cs.conference_participant_id = cp.id AND cp.school_id IS NULL AND cs.school_id IS NOT NULL;--> statement-breakpoint
UPDATE conference_participant cp SET school_id = d.school_id
FROM delegation_member dm
JOIN delegation d ON d.id = dm.delegation_id
WHERE dm.conference_participant_id = cp.id AND cp.school_id IS NULL AND d.school_id IS NOT NULL;--> statement-breakpoint

-- statistics_delegations grouped delegations by their school; the schools now get a view of their
-- own that counts people by their own school (see below).
DROP MATERIALIZED VIEW "statistics_delegations";--> statement-breakpoint
ALTER TABLE "conference_supervisor" DROP CONSTRAINT "conference_supervisor_school_id_school_id_fkey";--> statement-breakpoint
ALTER TABLE "delegation" DROP CONSTRAINT "delegation_school_id_school_id_fkey";--> statement-breakpoint
ALTER TABLE "single_participant" DROP CONSTRAINT "single_participant_school_id_school_id_fkey";--> statement-breakpoint
DROP INDEX "delegation_school_id_idx";--> statement-breakpoint
DROP INDEX "single_participant_school_id_idx";--> statement-breakpoint
ALTER TABLE "conference_supervisor" DROP COLUMN "school_id";--> statement-breakpoint
ALTER TABLE "delegation" DROP COLUMN "school_id";--> statement-breakpoint
ALTER TABLE "single_participant" DROP COLUMN "school_id";--> statement-breakpoint
CREATE MATERIALIZED VIEW "statistics_delegations" AS
SELECT
	d.conference_id,
	d.applied,
	d.assigned_role_id IS NOT NULL AS has_role,
	count(*)::int AS delegations,
	coalesce(sum(
		(SELECT count(*) FROM delegation_member dm WHERE dm.delegation_id = d.id)
	), 0)::int AS members
FROM delegation d
GROUP BY 1, 2, 3
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_delegations_key" ON "statistics_delegations" (
	"conference_id", "applied", "has_role"
);--> statement-breakpoint

-- Delegation members and single participants per school, each by their own school, whatever
-- delegation the assignment put them in. People without a school are one row with a null school.
CREATE MATERIALIZED VIEW "statistics_schools" AS
SELECT
	p.conference_id,
	p.applied,
	p.has_role,
	s.id AS school_id,
	s.name AS school,
	count(*)::int AS people
FROM statistics_participation p
JOIN conference_participant cp ON cp.user_id = p.user_id AND cp.conference_id = p.conference_id
LEFT JOIN school s ON s.id = cp.school_id
WHERE p.kind IN ('DELEGATION_MEMBER', 'SINGLE_PARTICIPANT')
GROUP BY 1, 2, 3, 4, 5
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_schools_key" ON "statistics_schools" (
	"conference_id", "applied", "has_role", "school_id"
) NULLS NOT DISTINCT;
