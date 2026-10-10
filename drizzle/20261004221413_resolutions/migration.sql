-- Hand-edited on top of drizzle-kit's output: the Prisma version of the app gained the same table
-- (as "Resolution", camelCase) after the baseline was cut, so a database Prisma already migrated
-- has it. There it is renamed into place, keeping its rows; everywhere else it is created.
DO $resolutions$
BEGIN
	IF to_regclass('"Resolution"') IS NOT NULL THEN
		ALTER TABLE "Resolution" RENAME TO "resolution";
		ALTER TABLE "resolution" RENAME COLUMN "fileName" TO "file_name";
		ALTER TABLE "resolution" RENAME COLUMN "conferenceId" TO "conference_id";
		ALTER TABLE "resolution" RENAME COLUMN "committeeId" TO "committee_id";
		ALTER TABLE "resolution" RENAME COLUMN "createdAt" TO "created_at";
		ALTER TABLE "resolution" RENAME COLUMN "updatedAt" TO "updated_at";
		ALTER TABLE "resolution" RENAME CONSTRAINT "Resolution_pkey" TO "resolution_pkey";
		ALTER TABLE "resolution" RENAME CONSTRAINT "Resolution_conferenceId_fkey" TO "resolution_conference_id_conference_id_fkey";
		ALTER TABLE "resolution" RENAME CONSTRAINT "Resolution_committeeId_fkey" TO "resolution_committee_id_committee_id_fkey";
		RETURN;
	END IF;

CREATE TABLE "resolution" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"content" text NOT NULL,
	"conference_id" text NOT NULL,
	"committee_id" text
);
ALTER TABLE "resolution" ADD CONSTRAINT "resolution_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "resolution" ADD CONSTRAINT "resolution_committee_id_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
END
$resolutions$;
