-- An entry without a track used to run on all tracks of its day; now every entry names its tracks
INSERT INTO "calendar_entry_to_calendar_track" ("id", "a", "b")
SELECT md5(random()::text || e."id" || t."id"), e."id", t."id"
FROM "calendar_entry" e
JOIN "calendar_track" t ON t."calendar_day_id" = e."calendar_day_id"
WHERE NOT EXISTS (
	SELECT 1 FROM "calendar_entry_to_calendar_track" l WHERE l."a" = e."id"
);
