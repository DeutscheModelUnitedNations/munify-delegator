CREATE TYPE "guide_page_kind" AS ENUM('GENERAL', 'COMMITTEE', 'AGENDA_ITEM');--> statement-breakpoint
CREATE TABLE "conference_series" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text NOT NULL,
	"abbreviation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_outline" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL UNIQUE,
	"draft" jsonb NOT NULL,
	"draft_updated_by_id" text,
	"published" jsonb,
	"published_at" timestamp(3),
	"published_by_id" text
);
--> statement-breakpoint
CREATE TABLE "guide_outline_version" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"outline_id" text NOT NULL,
	"number" integer NOT NULL,
	"outline" jsonb NOT NULL,
	"published_by_id" text
);
--> statement-breakpoint
CREATE TABLE "guide_page" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"kind" "guide_page_kind" DEFAULT 'GENERAL'::"guide_page_kind" NOT NULL,
	"series_id" text,
	"year" integer,
	"conference_id" text,
	"committee_id" text,
	"agenda_item_id" text,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"draft_updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"draft_updated_by_id" text,
	"published_version_id" text,
	"published_series_id" text,
	"published_year" integer,
	"published_conference_id" text,
	CONSTRAINT "guide_page_scope" CHECK (num_nonnulls("series_id", "year", "conference_id") <= 1),
	CONSTRAINT "guide_page_published_scope" CHECK (num_nonnulls("published_series_id", "published_year", "published_conference_id") <= 1),
	CONSTRAINT "guide_page_kind_owner" CHECK (("kind" = 'GENERAL' and "committee_id" is null and "agenda_item_id" is null)
				or ("kind" = 'COMMITTEE' and "committee_id" is not null and "agenda_item_id" is null and "conference_id" is not null)
				or ("kind" = 'AGENDA_ITEM' and "agenda_item_id" is not null and "committee_id" is null and "conference_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "guide_page_file" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"page_id" text NOT NULL,
	"file_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guide_page_version" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"page_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"series_id" text,
	"year" integer,
	"conference_id" text,
	"published_by_id" text,
	"pdf_file_id" text,
	CONSTRAINT "guide_page_version_scope" CHECK (num_nonnulls("series_id", "year", "conference_id") <= 1)
);
--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "series_id" text;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "guide_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "guide_outline_version_outline_id_number_key" ON "guide_outline_version" ("outline_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_page_committee_id_key" ON "guide_page" ("committee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_page_agenda_item_id_key" ON "guide_page" ("agenda_item_id");--> statement-breakpoint
CREATE INDEX "guide_page_conference_id_idx" ON "guide_page" ("conference_id");--> statement-breakpoint
CREATE INDEX "guide_page_series_id_idx" ON "guide_page" ("series_id");--> statement-breakpoint
CREATE INDEX "guide_page_published_conference_id_idx" ON "guide_page" ("published_conference_id");--> statement-breakpoint
CREATE INDEX "guide_page_published_series_id_idx" ON "guide_page" ("published_series_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_page_file_page_id_file_id_key" ON "guide_page_file" ("page_id","file_id");--> statement-breakpoint
CREATE INDEX "guide_page_file_file_id_idx" ON "guide_page_file" ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "guide_page_version_page_id_number_key" ON "guide_page_version" ("page_id","number");--> statement-breakpoint
ALTER TABLE "conference" ADD CONSTRAINT "conference_series_id_conference_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "conference_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_outline" ADD CONSTRAINT "guide_outline_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_outline" ADD CONSTRAINT "guide_outline_draft_updated_by_id_user_id_fkey" FOREIGN KEY ("draft_updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_outline" ADD CONSTRAINT "guide_outline_published_by_id_user_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_outline_version" ADD CONSTRAINT "guide_outline_version_outline_id_guide_outline_id_fkey" FOREIGN KEY ("outline_id") REFERENCES "guide_outline"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_outline_version" ADD CONSTRAINT "guide_outline_version_published_by_id_user_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page" ADD CONSTRAINT "guide_page_series_id_conference_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "conference_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page" ADD CONSTRAINT "guide_page_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page" ADD CONSTRAINT "guide_page_committee_id_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page" ADD CONSTRAINT "guide_page_agenda_item_id_committee_agenda_item_id_fkey" FOREIGN KEY ("agenda_item_id") REFERENCES "committee_agenda_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page" ADD CONSTRAINT "guide_page_draft_updated_by_id_user_id_fkey" FOREIGN KEY ("draft_updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page" ADD CONSTRAINT "guide_page_published_version_id_guide_page_version_id_fkey" FOREIGN KEY ("published_version_id") REFERENCES "guide_page_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page" ADD CONSTRAINT "guide_page_published_series_id_conference_series_id_fkey" FOREIGN KEY ("published_series_id") REFERENCES "conference_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page" ADD CONSTRAINT "guide_page_published_conference_id_conference_id_fkey" FOREIGN KEY ("published_conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page_file" ADD CONSTRAINT "guide_page_file_page_id_guide_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "guide_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page_file" ADD CONSTRAINT "guide_page_file_file_id_stored_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_file"("id") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page_version" ADD CONSTRAINT "guide_page_version_page_id_guide_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "guide_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page_version" ADD CONSTRAINT "guide_page_version_series_id_conference_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "conference_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page_version" ADD CONSTRAINT "guide_page_version_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page_version" ADD CONSTRAINT "guide_page_version_published_by_id_user_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "guide_page_version" ADD CONSTRAINT "guide_page_version_pdf_file_id_stored_file_id_fkey" FOREIGN KEY ("pdf_file_id") REFERENCES "stored_file"("id") ON UPDATE CASCADE;--> statement-breakpoint
-- A committee or agenda item page belongs to the conference of its committee: the page's own
-- conference, its committee's and its agenda item's must be the same (`assert_same_conference`,
-- from the `conference_anchor` migration).
CREATE FUNCTION "guide_page_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		NEW.conference_id,
		NEW.published_conference_id,
		(SELECT conference_id FROM committee WHERE id = NEW.committee_id),
		(SELECT x.conference_id FROM committee_agenda_item c JOIN committee x ON x.id = c.committee_id WHERE c.id = NEW.agenda_item_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "guide_page_same_conference" AFTER INSERT OR UPDATE ON "guide_page"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "guide_page_same_conference"();
