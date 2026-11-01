-- Turns the free-text school names into rows of `school`. Spellings that differ only in case or
-- whitespace become one school, named by its most used spelling; the team merges what is left
-- on the cleanup page. Empty names and the "No Info" placeholder the seat assignment used to
-- write name no school.
CREATE TEMP TABLE school_spelling AS
SELECT
	lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) AS key,
	regexp_replace(btrim(name), '\s+', ' ', 'g') AS name,
	count(*) AS uses
FROM (
	SELECT school AS name FROM delegation
	UNION ALL SELECT school FROM single_participant
	UNION ALL SELECT school FROM waiting_list_entry
) names
WHERE name IS NOT NULL AND btrim(name) <> '' AND btrim(name) <> 'No Info'
GROUP BY 1, 2;--> statement-breakpoint

CREATE TEMP TABLE school_key AS
SELECT DISTINCT ON (key)
	key,
	replace(gen_random_uuid()::text, '-', '') AS id,
	name
FROM school_spelling
ORDER BY key, uses DESC, name;--> statement-breakpoint

INSERT INTO school (id, name) SELECT id, name FROM school_key;--> statement-breakpoint

UPDATE delegation d SET school_id = k.id
FROM school_key k
WHERE lower(regexp_replace(btrim(d.school), '\s+', ' ', 'g')) = k.key;--> statement-breakpoint

UPDATE single_participant s SET school_id = k.id
FROM school_key k
WHERE lower(regexp_replace(btrim(s.school), '\s+', ' ', 'g')) = k.key;--> statement-breakpoint

UPDATE waiting_list_entry w SET school_id = k.id
FROM school_key k
WHERE lower(regexp_replace(btrim(w.school), '\s+', ' ', 'g')) = k.key;--> statement-breakpoint

-- A seat given from the waiting list has no recorded date; the entry's last change is the best
-- guess there is.
UPDATE waiting_list_entry SET assigned_at = updated_at WHERE assigned;--> statement-breakpoint

-- The duplicate analysis grouped spellings; it now groups schools and runs again on its own.
DELETE FROM school_suggestion;--> statement-breakpoint
DROP TABLE school_key;--> statement-breakpoint
DROP TABLE school_spelling;--> statement-breakpoint

-- statistics_delegations grouped by the school text; it now reads the school's name.
DROP MATERIALIZED VIEW "statistics_delegations";--> statement-breakpoint
CREATE MATERIALIZED VIEW "statistics_delegations" AS
SELECT
	d.conference_id,
	d.applied,
	d.assigned_role_id IS NOT NULL AS has_role,
	s.name AS school,
	count(*)::int AS delegations,
	coalesce(sum(
		(SELECT count(*) FROM delegation_member dm WHERE dm.delegation_id = d.id)
	), 0)::int AS members
FROM delegation d
LEFT JOIN school s ON s.id = d.school_id
GROUP BY 1, 2, 3, 4
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_delegations_key" ON "statistics_delegations" (
	"conference_id", "applied", "has_role", "school"
) NULLS NOT DISTINCT;
--> statement-breakpoint

-- The updates above queued the deferred same-conference checks; run them now, since the next
-- migration alters these tables in the same transaction, which Postgres refuses while trigger
-- events are pending.
SET CONSTRAINTS ALL IMMEDIATE;
