CREATE TABLE "calendar_day_to_calendar_track" (
	"id" text PRIMARY KEY,
	"a" text NOT NULL,
	"b" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_track_to_committee" (
	"id" text PRIMARY KEY,
	"a" text NOT NULL,
	"b" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_track_to_conference_role" (
	"id" text PRIMARY KEY,
	"a" text NOT NULL,
	"b" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mailing_list" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"listmonk_list_id" integer NOT NULL UNIQUE,
	"conference_id" text,
	"list_type" text NOT NULL,
	CONSTRAINT "mailing_list_conference_id_list_type_key" UNIQUE NULLS NOT DISTINCT("conference_id","list_type")
);
--> statement-breakpoint
-- Tracks become the conference's: a day's tracks are what `calendar_day_to_calendar_track` links
-- to it. The tracks days had of the same name were one track in all but the database, so they
-- are merged into one per conference and name (the first by sort order), which takes over their
-- days, entries and description.
DROP TRIGGER "calendar_track_conference_immutable" ON "calendar_track";--> statement-breakpoint
-- The check reads the track's conference from the column that replaces its day, and is deferred
-- to the commit, after the day is gone
CREATE OR REPLACE FUNCTION "calendar_entry_to_calendar_track_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT x.conference_id FROM calendar_entry c JOIN calendar_day x ON x.id = c.calendar_day_id WHERE c.id = NEW.a),
		(SELECT conference_id FROM calendar_track WHERE id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "calendar_track" ADD COLUMN "conference_id" text;--> statement-breakpoint
UPDATE "calendar_track" t SET "conference_id" = d."conference_id"
	FROM "calendar_day" d WHERE d."id" = t."calendar_day_id";--> statement-breakpoint
CREATE TEMPORARY TABLE "calendar_track_merge" AS
	SELECT "id", "calendar_day_id",
		first_value("id") OVER (PARTITION BY "conference_id", "name" ORDER BY "sort_order", "id") AS "keeper"
	FROM "calendar_track";--> statement-breakpoint
INSERT INTO "calendar_day_to_calendar_track" ("id", "a", "b")
	SELECT gen_random_uuid()::text, "calendar_day_id", "keeper"
	FROM (SELECT DISTINCT "calendar_day_id", "keeper" FROM "calendar_track_merge") days;--> statement-breakpoint
INSERT INTO "calendar_entry_to_calendar_track" ("id", "a", "b")
	SELECT gen_random_uuid()::text, l."a", m."keeper"
	FROM "calendar_entry_to_calendar_track" l JOIN "calendar_track_merge" m ON m."id" = l."b"
	WHERE m."id" <> m."keeper"
	ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "calendar_track" t SET "description" = (
		SELECT o."description" FROM "calendar_track_merge" m JOIN "calendar_track" o ON o."id" = m."id"
		WHERE m."keeper" = t."id" AND o."description" IS NOT NULL
		ORDER BY o."sort_order", o."id" LIMIT 1
	)
	WHERE t."description" IS NULL;--> statement-breakpoint
DELETE FROM "calendar_track" t USING "calendar_track_merge" m
	WHERE m."id" = t."id" AND m."id" <> m."keeper";--> statement-breakpoint
DROP TABLE "calendar_track_merge";--> statement-breakpoint
ALTER TABLE "calendar_track" ALTER COLUMN "conference_id" SET NOT NULL;--> statement-breakpoint
-- Dropping the column drops its foreign key and index with it: the key is named differently in
-- databases that started under Prisma, so it is not named here.
ALTER TABLE "calendar_track" DROP COLUMN "calendar_day_id";--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_day_to_calendar_track_ab_key" ON "calendar_day_to_calendar_track" ("a","b");--> statement-breakpoint
CREATE INDEX "calendar_day_to_calendar_track_b_index" ON "calendar_day_to_calendar_track" ("b");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_track_conference_id_name_key" ON "calendar_track" ("conference_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_track_to_committee_ab_key" ON "calendar_track_to_committee" ("a","b");--> statement-breakpoint
CREATE INDEX "calendar_track_to_committee_b_index" ON "calendar_track_to_committee" ("b");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_track_to_conference_role_ab_key" ON "calendar_track_to_conference_role" ("a","b");--> statement-breakpoint
CREATE INDEX "calendar_track_to_conference_role_b_index" ON "calendar_track_to_conference_role" ("b");--> statement-breakpoint
ALTER TABLE "calendar_day_to_calendar_track" ADD CONSTRAINT "calendar_day_to_calendar_track_a_calendar_day_id_fkey" FOREIGN KEY ("a") REFERENCES "calendar_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_day_to_calendar_track" ADD CONSTRAINT "calendar_day_to_calendar_track_b_calendar_track_id_fkey" FOREIGN KEY ("b") REFERENCES "calendar_track"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_track" ADD CONSTRAINT "calendar_track_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_track_to_committee" ADD CONSTRAINT "calendar_track_to_committee_a_calendar_track_id_fkey" FOREIGN KEY ("a") REFERENCES "calendar_track"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_track_to_committee" ADD CONSTRAINT "calendar_track_to_committee_b_committee_id_fkey" FOREIGN KEY ("b") REFERENCES "committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_track_to_conference_role" ADD CONSTRAINT "calendar_track_to_conference_role_a_calendar_track_id_fkey" FOREIGN KEY ("a") REFERENCES "calendar_track"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "calendar_track_to_conference_role" ADD CONSTRAINT "calendar_track_to_conference_role_b_conference_role_id_fkey" FOREIGN KEY ("b") REFERENCES "conference_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
CREATE TRIGGER "calendar_track_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "calendar_track"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
-- The days, committees and roles a track names are of its conference (`assert_same_conference`,
-- from the `conference_anchor` migration).
CREATE FUNCTION "calendar_day_to_calendar_track_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM calendar_day WHERE id = NEW.a),
		(SELECT conference_id FROM calendar_track WHERE id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "calendar_day_to_calendar_track_same_conference" AFTER INSERT OR UPDATE ON "calendar_day_to_calendar_track"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "calendar_day_to_calendar_track_same_conference"();--> statement-breakpoint
CREATE FUNCTION "calendar_track_to_committee_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM calendar_track WHERE id = NEW.a),
		(SELECT conference_id FROM committee WHERE id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "calendar_track_to_committee_same_conference" AFTER INSERT OR UPDATE ON "calendar_track_to_committee"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "calendar_track_to_committee_same_conference"();--> statement-breakpoint
CREATE FUNCTION "calendar_track_to_conference_role_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM calendar_track WHERE id = NEW.a),
		(SELECT conference_id FROM conference_role WHERE id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "calendar_track_to_conference_role_same_conference" AFTER INSERT OR UPDATE ON "calendar_track_to_conference_role"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "calendar_track_to_conference_role_same_conference"();--> statement-breakpoint
-- An entry runs only on tracks of its day. Checked at commit, from each side that can break it:
-- an entry put on a track, an entry moved to another day, a track taken off a day.
CREATE FUNCTION assert_entry_tracks_run_on_its_day(entry_id text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM calendar_entry_to_calendar_track l
		JOIN calendar_entry e ON e.id = l.a
		WHERE l.a = entry_id AND NOT EXISTS (
			SELECT 1 FROM calendar_day_to_calendar_track d WHERE d.a = e.calendar_day_id AND d.b = l.b
		)
	) THEN
		RAISE EXCEPTION 'a calendar entry runs on a track its day does not have'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'calendar_entry_track_runs_on_day';
	END IF;
END $$;--> statement-breakpoint
CREATE FUNCTION "calendar_entry_to_calendar_track_runs_on_day"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_entry_tracks_run_on_its_day(NEW.a);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "calendar_entry_to_calendar_track_runs_on_day" AFTER INSERT OR UPDATE ON "calendar_entry_to_calendar_track"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "calendar_entry_to_calendar_track_runs_on_day"();--> statement-breakpoint
CREATE FUNCTION "calendar_entry_tracks_run_on_day"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_entry_tracks_run_on_its_day(NEW.id);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "calendar_entry_tracks_run_on_day" AFTER UPDATE OF "calendar_day_id" ON "calendar_entry"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "calendar_entry_tracks_run_on_day"();--> statement-breakpoint
CREATE FUNCTION "calendar_day_to_calendar_track_keeps_entries"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM calendar_entry_to_calendar_track l
		JOIN calendar_entry e ON e.id = l.a
		WHERE e.calendar_day_id = OLD.a AND l.b = OLD.b
	) AND NOT EXISTS (
		SELECT 1 FROM calendar_day_to_calendar_track WHERE a = OLD.a AND b = OLD.b
	) THEN
		RAISE EXCEPTION 'a track taken off a day still has entries there'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'calendar_entry_track_runs_on_day';
	END IF;
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "calendar_day_to_calendar_track_keeps_entries" AFTER DELETE OR UPDATE ON "calendar_day_to_calendar_track"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "calendar_day_to_calendar_track_keeps_entries"();
