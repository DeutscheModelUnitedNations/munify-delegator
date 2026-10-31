-- Entries from before sessions existed (or made by hand) keep their occasion by getting a closed
-- session of their own: one per conference and occasion, spanning the entries it adopts.
INSERT INTO "attendance_session" ("id", "conference_id", "occasion", "started_at", "ended_at", "created_by_id")
SELECT
	'legacy-' || md5(s."conference_id" || ':' || e."occasion"),
	s."conference_id",
	e."occasion",
	min(e."timestamp"),
	max(e."timestamp"),
	(array_agg(e."recorded_by_id" ORDER BY e."timestamp"))[1]
FROM "attendance_entry" e
JOIN "conference_participant_status" s ON s."id" = e."conference_participant_status_id"
WHERE e."session_id" IS NULL
GROUP BY s."conference_id", e."occasion";--> statement-breakpoint
UPDATE "attendance_entry" e
SET "session_id" = 'legacy-' || md5(s."conference_id" || ':' || e."occasion")
FROM "conference_participant_status" s
WHERE s."id" = e."conference_participant_status_id" AND e."session_id" IS NULL;--> statement-breakpoint
ALTER TABLE "attendance_entry" DROP COLUMN "occasion";--> statement-breakpoint
ALTER TABLE "attendance_entry" ALTER COLUMN "session_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_entry" DROP CONSTRAINT "attendance_entry_session_id_attendance_session_id_fkey", ADD CONSTRAINT "attendance_entry_session_id_attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "attendance_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;