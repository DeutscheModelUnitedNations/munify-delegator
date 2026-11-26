CREATE TYPE "agreement_field" AS ENUM('termsAccepted', 'termsPlaceDate', 'termsSignature', 'guardianPlaceDate', 'guardian1Name', 'guardian2Name', 'guardian1Signature', 'guardian2Signature', 'mediaPhoto', 'mediaVideo', 'mediaByDmun', 'mediaByOthers', 'mediaInternal', 'mediaDocumentation', 'mediaPapers', 'mediaPress', 'mediaWebsite', 'mediaSocial', 'mediaSearch', 'mediaAdvertising', 'mediaPlaceDate', 'mediaSignature', 'mediaGuardian1Name', 'mediaGuardian2Name', 'mediaGuardianPlaceDate', 'mediaGuardian1Signature', 'mediaGuardian2Signature');--> statement-breakpoint
CREATE TYPE "agreement_source" AS ENUM('SCAN', 'MANUAL');--> statement-breakpoint
CREATE TYPE "agreement_state" AS ENUM('yes', 'no', 'unclear');--> statement-breakpoint
CREATE TYPE "postal_scan_source" AS ENUM('UPLOAD', 'FOLDER', 'WEBDAV');--> statement-breakpoint
CREATE TYPE "scan_task_kind" AS ENUM('SPLIT', 'PAGE', 'FINISH');--> statement-breakpoint
ALTER TYPE "email_kind" ADD VALUE 'SCAN_PROBLEM';--> statement-breakpoint
ALTER TYPE "notification_topic" ADD VALUE 'SCAN_PROBLEM';--> statement-breakpoint
CREATE TABLE "agreement_detail" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_participant_id" text NOT NULL,
	"field" "agreement_field" NOT NULL,
	"state" "agreement_state" NOT NULL,
	"source" "agreement_source" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postal_scan" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_participant_id" text NOT NULL,
	"file_id" text NOT NULL,
	"source" "postal_scan_source" NOT NULL,
	"page_key" text NOT NULL,
	"fields" text[] NOT NULL,
	"readings" jsonb,
	"uploaded_by_id" text
);
--> statement-breakpoint
CREATE TABLE "scan_delivery" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" text NOT NULL,
	"access_name" text NOT NULL,
	"file_name" text NOT NULL,
	"key" text NOT NULL UNIQUE,
	"size" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_task" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"delivery_id" text NOT NULL,
	"kind" "scan_task_kind" NOT NULL,
	"page" integer DEFAULT 0 NOT NULL,
	"file_id" text,
	"held_by" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp(3) NOT NULL,
	"done_at" timestamp(3),
	"result" jsonb
);
--> statement-breakpoint
CREATE TABLE "scanner_access" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"expires_at" timestamp(3) NOT NULL,
	"last_used_at" timestamp(3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "agreement_detail_conference_participant_id_field_key" ON "agreement_detail" ("conference_participant_id","field");--> statement-breakpoint
CREATE UNIQUE INDEX "postal_scan_conference_participant_id_page_key_key" ON "postal_scan" ("conference_participant_id","page_key");--> statement-breakpoint
CREATE INDEX "postal_scan_file_id_idx" ON "postal_scan" ("file_id");--> statement-breakpoint
CREATE INDEX "scan_delivery_user_id_idx" ON "scan_delivery" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scan_task_delivery_id_kind_page_key" ON "scan_task" ("delivery_id","kind","page");--> statement-breakpoint
CREATE INDEX "scan_task_due_at_idx" ON "scan_task" ("due_at") WHERE ("done_at" is null);--> statement-breakpoint
CREATE INDEX "scan_task_file_id_idx" ON "scan_task" ("file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scanner_access_username_key" ON "scanner_access" ("username");--> statement-breakpoint
CREATE INDEX "scanner_access_user_id_idx" ON "scanner_access" ("user_id");--> statement-breakpoint
ALTER TABLE "agreement_detail" ADD CONSTRAINT "agreement_detail_448UKGdZ5C3A_fkey" FOREIGN KEY ("conference_participant_id") REFERENCES "conference_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "postal_scan" ADD CONSTRAINT "postal_scan_N4fsn5QMRyKr_fkey" FOREIGN KEY ("conference_participant_id") REFERENCES "conference_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "postal_scan" ADD CONSTRAINT "postal_scan_file_id_stored_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_file"("id") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "postal_scan" ADD CONSTRAINT "postal_scan_uploaded_by_id_user_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "scan_delivery" ADD CONSTRAINT "scan_delivery_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "scan_task" ADD CONSTRAINT "scan_task_delivery_id_scan_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "scan_delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "scan_task" ADD CONSTRAINT "scan_task_file_id_stored_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_file"("id") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "scanner_access" ADD CONSTRAINT "scanner_access_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;