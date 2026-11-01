CREATE TABLE "stored_file" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"key" text NOT NULL UNIQUE,
	"purpose" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"file_name" text,
	"conference_id" text NOT NULL,
	"uploaded_by_id" text
);
--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "image_file_id" text;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "guardian_consent_file_id" text;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "media_consent_file_id" text;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "terms_and_conditions_file_id" text;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "contract_file_id" text;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "certificate_file_id" text;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "emblem_file_id" text;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "logo_file_id" text;--> statement-breakpoint
ALTER TABLE "place" ADD COLUMN "site_plan_file_id" text;--> statement-breakpoint
ALTER TABLE "resolution" ADD COLUMN "file_id" text;--> statement-breakpoint
-- Hand-edited: the files stored inline so far (data URLs) move into the bucket in two steps. Here
-- each becomes a `stored_file` the row points at, keyed like an upload (`objectKey`), and its
-- bytes wait in "legacy_file_upload"; the `upload-legacy-files` job then puts them into the
-- bucket and drops that table. It is not in the drizzle schema: nothing but the job reads it.
CREATE TABLE "legacy_file_upload" (
	"stored_file_id" text PRIMARY KEY REFERENCES "stored_file"("id") ON DELETE CASCADE,
	"bytes" bytea NOT NULL
);--> statement-breakpoint
CREATE TEMP TABLE legacy_inline_file AS
SELECT gen_random_uuid()::text AS file_id, src.*
FROM (
	SELECT 'conference', "id", "id", 'image', "image_data_url", NULL FROM "conference"
	UNION ALL
	SELECT 'conference', "id", "id", 'emblem', "emblem_data_url", NULL FROM "conference"
	UNION ALL
	SELECT 'conference', "id", "id", 'logo', "logo_data_url", NULL FROM "conference"
	UNION ALL
	SELECT 'conference', "id", "id", 'contract', "contract_content", NULL FROM "conference"
	UNION ALL
	SELECT 'conference', "id", "id", 'guardianConsent', "guardian_consent_content", NULL FROM "conference"
	UNION ALL
	SELECT 'conference', "id", "id", 'mediaConsent', "media_consent_content", NULL FROM "conference"
	UNION ALL
	SELECT 'conference', "id", "id", 'termsAndConditions', "terms_and_conditions_content", NULL FROM "conference"
	UNION ALL
	SELECT 'conference', "id", "id", 'certificate', "certificate_content", NULL FROM "conference"
	UNION ALL
	SELECT 'place', "id", "conference_id", 'sitePlan', "site_plan_data_url", NULL FROM "place"
	UNION ALL
	SELECT 'resolution', "id", "conference_id", 'content', "content", "file_name" FROM "resolution"
) AS src (kind, row_id, conference_id, field, data_url, file_name)
WHERE src.data_url IS NOT NULL AND src.data_url <> '';--> statement-breakpoint
DO $legacy_files$
DECLARE
	malformed text;
BEGIN
	SELECT string_agg(kind || ' ' || row_id || ' (' || field || ')', ', ') INTO malformed
	FROM legacy_inline_file
	WHERE data_url !~ '^data:[^,]*;base64,';
	IF malformed IS NOT NULL THEN
		RAISE EXCEPTION 'Not a base64 data URL, so it cannot move into the bucket: %', malformed;
	END IF;
END
$legacy_files$;--> statement-breakpoint
ALTER TABLE legacy_inline_file ADD COLUMN bytes bytea, ADD COLUMN mime_type text;--> statement-breakpoint
-- A data URL without a type held a PDF, as the old decoder assumed.
UPDATE legacy_inline_file SET
	bytes = decode(substr(data_url, strpos(data_url, ',') + 1), 'base64'),
	mime_type = coalesce(nullif(substring(data_url FROM '^data:([^;,]*)'), ''), 'application/pdf');--> statement-breakpoint
INSERT INTO "stored_file" ("id", "key", "purpose", "mime_type", "size", "file_name", "conference_id")
SELECT
	file_id,
	'conferences/' || conference_id || '/' || kind || '/' || field || '/' || file_id,
	kind || '/' || field,
	mime_type,
	octet_length(bytes),
	file_name,
	conference_id
FROM legacy_inline_file;--> statement-breakpoint
INSERT INTO "legacy_file_upload" ("stored_file_id", "bytes")
SELECT file_id, bytes FROM legacy_inline_file;--> statement-breakpoint
UPDATE "conference" c SET
	"image_file_id" = (SELECT f.file_id FROM legacy_inline_file f WHERE f.kind = 'conference' AND f.field = 'image' AND f.row_id = c.id),
	"emblem_file_id" = (SELECT f.file_id FROM legacy_inline_file f WHERE f.kind = 'conference' AND f.field = 'emblem' AND f.row_id = c.id),
	"logo_file_id" = (SELECT f.file_id FROM legacy_inline_file f WHERE f.kind = 'conference' AND f.field = 'logo' AND f.row_id = c.id),
	"contract_file_id" = (SELECT f.file_id FROM legacy_inline_file f WHERE f.kind = 'conference' AND f.field = 'contract' AND f.row_id = c.id),
	"guardian_consent_file_id" = (SELECT f.file_id FROM legacy_inline_file f WHERE f.kind = 'conference' AND f.field = 'guardianConsent' AND f.row_id = c.id),
	"media_consent_file_id" = (SELECT f.file_id FROM legacy_inline_file f WHERE f.kind = 'conference' AND f.field = 'mediaConsent' AND f.row_id = c.id),
	"terms_and_conditions_file_id" = (SELECT f.file_id FROM legacy_inline_file f WHERE f.kind = 'conference' AND f.field = 'termsAndConditions' AND f.row_id = c.id),
	"certificate_file_id" = (SELECT f.file_id FROM legacy_inline_file f WHERE f.kind = 'conference' AND f.field = 'certificate' AND f.row_id = c.id);--> statement-breakpoint
UPDATE "place" p SET "site_plan_file_id" = f.file_id
FROM legacy_inline_file f
WHERE f.kind = 'place' AND f.row_id = p.id;--> statement-breakpoint
UPDATE "resolution" r SET "file_id" = f.file_id
FROM legacy_inline_file f
WHERE f.kind = 'resolution' AND f.row_id = r.id;--> statement-breakpoint
-- A resolution is nothing but its file, so one with an empty one goes.
DELETE FROM "resolution" WHERE "file_id" IS NULL;--> statement-breakpoint
ALTER TABLE "resolution" ALTER COLUMN "file_id" SET NOT NULL;--> statement-breakpoint
DROP TABLE legacy_inline_file;--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "image_data_url";--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "guardian_consent_content";--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "media_consent_content";--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "terms_and_conditions_content";--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "contract_content";--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "certificate_content";--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "emblem_data_url";--> statement-breakpoint
ALTER TABLE "conference" DROP COLUMN "logo_data_url";--> statement-breakpoint
ALTER TABLE "place" DROP COLUMN "site_plan_data_url";--> statement-breakpoint
ALTER TABLE "resolution" DROP COLUMN "content";--> statement-breakpoint
CREATE INDEX "stored_file_created_at_idx" ON "stored_file" ("created_at");--> statement-breakpoint
ALTER TABLE "conference" ADD CONSTRAINT "conference_image_file_id_stored_file_id_fkey" FOREIGN KEY ("image_file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference" ADD CONSTRAINT "conference_guardian_consent_file_id_stored_file_id_fkey" FOREIGN KEY ("guardian_consent_file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference" ADD CONSTRAINT "conference_media_consent_file_id_stored_file_id_fkey" FOREIGN KEY ("media_consent_file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference" ADD CONSTRAINT "conference_terms_and_conditions_file_id_stored_file_id_fkey" FOREIGN KEY ("terms_and_conditions_file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference" ADD CONSTRAINT "conference_contract_file_id_stored_file_id_fkey" FOREIGN KEY ("contract_file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference" ADD CONSTRAINT "conference_certificate_file_id_stored_file_id_fkey" FOREIGN KEY ("certificate_file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference" ADD CONSTRAINT "conference_emblem_file_id_stored_file_id_fkey" FOREIGN KEY ("emblem_file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference" ADD CONSTRAINT "conference_logo_file_id_stored_file_id_fkey" FOREIGN KEY ("logo_file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "place" ADD CONSTRAINT "place_site_plan_file_id_stored_file_id_fkey" FOREIGN KEY ("site_plan_file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "resolution" ADD CONSTRAINT "resolution_file_id_stored_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_file"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_uploaded_by_id_user_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;