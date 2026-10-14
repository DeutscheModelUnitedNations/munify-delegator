-- Custom SQL migration file, put your code below! ---- `user.birthday` becomes a `date` (next migration). The account form stored the picked day as the
-- browser's local midnight, so a German birthday sits at 22:00 or 23:00 UTC on the day before, and
-- a plain cast would move it back a day. Reading each value as Berlin wall-clock time first lands on
-- the picked day for every UTC offset between -10 and +2, which covers the conferences' audience.
UPDATE "user"
SET "birthday" = date_trunc('day', ("birthday" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin')
WHERE "birthday" IS NOT NULL;
--> statement-breakpoint
-- `statistics_ages` and `statistics_participant_status` read the column, and postgres will not
-- change the type of a column a view depends on; `birthday_statistics_views` creates them again
-- once the column is a date.
DROP MATERIALIZED VIEW "statistics_ages";
--> statement-breakpoint
DROP MATERIALIZED VIEW "statistics_participant_status";
