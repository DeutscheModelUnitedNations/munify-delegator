-- `assigned_at` alone records the seat: an entry marked assigned without a date gets the last time
-- it changed, as the schools backfill did.
UPDATE "waiting_list_entry" SET "assigned_at" = "updated_at" WHERE "assigned" AND "assigned_at" IS NULL;--> statement-breakpoint
DROP MATERIALIZED VIEW "statistics_waiting_list";--> statement-breakpoint
DROP INDEX "waiting_list_entry_conference_id_assigned_created_at_idx";--> statement-breakpoint
ALTER TABLE "waiting_list_entry" DROP COLUMN "assigned";--> statement-breakpoint
CREATE INDEX "waiting_list_entry_conference_id_assigned_at_created_at_idx" ON "waiting_list_entry" ("conference_id","assigned_at","created_at");--> statement-breakpoint
CREATE MATERIALIZED VIEW "statistics_waiting_list" AS
SELECT conference_id, hidden, assigned_at IS NOT NULL AS assigned, count(*)::int AS count
FROM waiting_list_entry
GROUP BY 1, 2, 3
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_waiting_list_key"
	ON "statistics_waiting_list" ("conference_id", "hidden", "assigned");
