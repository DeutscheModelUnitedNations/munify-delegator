CREATE TABLE "calendar_entry_to_calendar_track" (
	"id" text PRIMARY KEY,
	"a" text NOT NULL,
	"b" text NOT NULL
);
--> statement-breakpoint
INSERT INTO "calendar_entry_to_calendar_track" ("id", "a", "b")
SELECT md5(random()::text || "id"), "id", "calendar_track_id" FROM "calendar_entry" WHERE "calendar_track_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_entry" DROP COLUMN "calendar_track_id";--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_entry_to_calendar_track_ab_key" ON "calendar_entry_to_calendar_track" ("a","b");--> statement-breakpoint
CREATE INDEX "calendar_entry_to_calendar_track_b_index" ON "calendar_entry_to_calendar_track" ("b");--> statement-breakpoint
ALTER TABLE "calendar_entry_to_calendar_track" ADD CONSTRAINT "calendar_entry_to_calendar_track_a_calendar_entry_id_fkey" FOREIGN KEY ("a") REFERENCES "calendar_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_entry_to_calendar_track" ADD CONSTRAINT "calendar_entry_to_calendar_track_b_calendar_track_id_fkey" FOREIGN KEY ("b") REFERENCES "calendar_track"("id") ON DELETE CASCADE ON UPDATE CASCADE;