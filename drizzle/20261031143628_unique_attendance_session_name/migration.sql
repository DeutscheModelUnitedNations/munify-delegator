-- A session's name is unique in its conference, ignoring case. Sessions that shared a name were
-- one occasion already (the certificates merged them), so they become one session: the earliest
-- keeps its id and survey options, takes the others' scans (one per person, the earliest), runs
-- from the first start to the last end (open while any was), and stays on the certificates only
-- if all of them were.
UPDATE "attendance_session" SET "occasion" = btrim("occasion") WHERE "occasion" <> btrim("occasion");--> statement-breakpoint
CREATE TEMP TABLE attendance_session_merge AS
SELECT
	s.id,
	first_value(s.id) OVER (
		PARTITION BY s.conference_id, lower(s.occasion)
		ORDER BY s.started_at, s.id
	) AS keeper_id
FROM "attendance_session" s;--> statement-breakpoint
DELETE FROM attendance_session_merge WHERE id = keeper_id;--> statement-breakpoint
UPDATE "attendance_session" k SET
	"started_at" = g.started_at,
	"ended_at" = g.ended_at,
	"show_on_certificate" = g.show_on_certificate
FROM (
	SELECT
		coalesce(m.keeper_id, s.id) AS keeper_id,
		min(s.started_at) AS started_at,
		CASE WHEN bool_or(s.ended_at IS NULL) THEN NULL ELSE max(s.ended_at) END AS ended_at,
		bool_and(s.show_on_certificate) AS show_on_certificate
	FROM "attendance_session" s
	LEFT JOIN attendance_session_merge m ON m.id = s.id
	GROUP BY coalesce(m.keeper_id, s.id)
	HAVING count(*) > 1
) g
WHERE k.id = g.keeper_id;--> statement-breakpoint
UPDATE "attendance_entry" e SET "session_id" = m.keeper_id
FROM attendance_session_merge m
WHERE e.session_id = m.id;--> statement-breakpoint
DELETE FROM "attendance_entry" e
USING "attendance_entry" earlier
WHERE earlier.session_id = e.session_id
	AND earlier.conference_participant_id = e.conference_participant_id
	AND (earlier.timestamp, earlier.id) < (e.timestamp, e.id);--> statement-breakpoint
DELETE FROM "attendance_session" s USING attendance_session_merge m WHERE s.id = m.id;--> statement-breakpoint
DROP TABLE attendance_session_merge;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_session_conference_id_occasion_key" ON "attendance_session" ("conference_id",lower("occasion"));
