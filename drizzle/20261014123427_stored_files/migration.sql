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
ALTER TABLE "resolution" ADD COLUMN "file_id" text NOT NULL;--> statement-breakpoint
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