CREATE TYPE "announcement_audience_kind" AS ENUM('EVERYONE', 'DELEGATES', 'SINGLE_PARTICIPANTS', 'SUPERVISORS', 'APPLICANTS', 'SEATED', 'WAITING_LIST', 'TEAM', 'COMMITTEE', 'ROLE', 'SURVEY_OPTION', 'PAYMENT_OPEN', 'PAPERWORK_OPEN', 'MINORS', 'ADULTS');--> statement-breakpoint
CREATE TYPE "announcement_importance" AS ENUM('NORMAL', 'IMPORTANT', 'URGENT');--> statement-breakpoint
CREATE TYPE "announcement_status" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
ALTER TYPE "email_kind" ADD VALUE 'ANNOUNCEMENT';--> statement-breakpoint
CREATE TABLE "announcement" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"importance" "announcement_importance" DEFAULT 'NORMAL'::"announcement_importance" NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"signature" text,
	"status" "announcement_status" DEFAULT 'DRAFT'::"announcement_status" NOT NULL,
	"publish_at" timestamp(3),
	"visible_until" timestamp(3),
	"edited_at" timestamp(3),
	"notify_by_mail" boolean DEFAULT false NOT NULL,
	"mail_since" timestamp(3),
	"mail_revision" integer DEFAULT 0 NOT NULL,
	"release_announced" boolean DEFAULT false NOT NULL,
	"author_id" text,
	"published_by_id" text
);
--> statement-breakpoint
CREATE TABLE "announcement_attachment" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"announcement_id" text NOT NULL,
	"file_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_audience" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"announcement_id" text NOT NULL,
	"kind" "announcement_audience_kind" NOT NULL,
	"committee_id" text,
	"role_id" text,
	"survey_option_id" text,
	"team_role" "team_role"
);
--> statement-breakpoint
CREATE TABLE "announcement_read" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"announcement_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
-- The single announcement a conference had (`conference.info`) becomes its first announcement:
-- published, pinned and for every participant, as it was shown before.
INSERT INTO "announcement" ("id", "conference_id", "title", "body", "pinned", "status", "publish_at", "release_announced")
	SELECT 'info-' || "id", "id", 'Ankündigung', "info", true, 'PUBLISHED', CURRENT_TIMESTAMP, true
	FROM "conference" WHERE "info" IS NOT NULL AND btrim("info") <> '';--> statement-breakpoint
INSERT INTO "announcement_audience" ("id", "announcement_id", "kind")
	SELECT 'info-' || "id", 'info-' || "id", 'EVERYONE'
	FROM "conference" WHERE "info" IS NOT NULL AND btrim("info") <> '';--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "info";--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "show_info_expanded";--> statement-breakpoint
CREATE INDEX "announcement_conference_id_status_publish_at_idx" ON "announcement" ("conference_id","status","publish_at");--> statement-breakpoint
CREATE INDEX "announcement_attachment_announcement_id_idx" ON "announcement_attachment" ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcement_audience_announcement_id_idx" ON "announcement_audience" ("announcement_id");--> statement-breakpoint
CREATE UNIQUE INDEX "announcement_read_announcement_id_user_id_key" ON "announcement_read" ("announcement_id","user_id");--> statement-breakpoint
CREATE INDEX "announcement_read_user_id_idx" ON "announcement_read" ("user_id");--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_published_by_id_user_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement_attachment" ADD CONSTRAINT "announcement_attachment_announcement_id_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement_attachment" ADD CONSTRAINT "announcement_attachment_file_id_stored_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_file"("id") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement_audience" ADD CONSTRAINT "announcement_audience_announcement_id_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement_audience" ADD CONSTRAINT "announcement_audience_committee_id_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement_audience" ADD CONSTRAINT "announcement_audience_role_id_conference_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "conference_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement_audience" ADD CONSTRAINT "announcement_audience_survey_option_id_survey_option_id_fkey" FOREIGN KEY ("survey_option_id") REFERENCES "survey_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_announcement_id_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
-- The committee, role and survey option an audience names are of the announcement's conference
-- (`assert_same_conference`, from the `conference_anchor` migration).
CREATE FUNCTION "announcement_audience_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM announcement WHERE id = NEW.announcement_id),
		(SELECT conference_id FROM committee WHERE id = NEW.committee_id),
		(SELECT conference_id FROM conference_role WHERE id = NEW.role_id),
		(SELECT x.conference_id FROM survey_option c JOIN survey_question x ON x.id = c.question_id WHERE c.id = NEW.survey_option_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "announcement_audience_same_conference" AFTER INSERT OR UPDATE ON "announcement_audience"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "announcement_audience_same_conference"();--> statement-breakpoint
-- An announcement stays in its conference.
CREATE FUNCTION "announcement_reach_unchanged"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NEW.conference_id IS DISTINCT FROM OLD.conference_id THEN
		RAISE EXCEPTION 'an announcement row cannot change its conference'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'announcement_conference_id_is_immutable';
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "announcement_conference_id_is_immutable" BEFORE UPDATE ON "announcement"
	FOR EACH ROW EXECUTE FUNCTION "announcement_reach_unchanged"();
