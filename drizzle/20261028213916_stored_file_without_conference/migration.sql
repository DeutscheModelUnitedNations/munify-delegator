-- Files are collected by the `file-cleanup` job once nothing points at them, so they no longer
-- name a conference; its immutability trigger (`conference_anchor`) goes with the column.
DROP TRIGGER "stored_file_conference_id_immutable" ON "stored_file";--> statement-breakpoint
ALTER TABLE "stored_file" DROP CONSTRAINT "stored_file_conference_id_conference_id_fkey";--> statement-breakpoint
ALTER TABLE "stored_file" DROP COLUMN "conference_id";