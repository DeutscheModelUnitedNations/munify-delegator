CREATE TYPE "scan_task_kind" AS ENUM('SPLIT', 'PAGE', 'FINISH');--> statement-breakpoint
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
ALTER TABLE "scanner_access" DROP CONSTRAINT "scanner_access_team_member_id_team_member_id_fkey";--> statement-breakpoint
DROP INDEX "scanner_access_team_member_id_idx";--> statement-breakpoint
ALTER TABLE "scanner_access" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "postal_scan" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "postal_scan_source";--> statement-breakpoint
CREATE TYPE "postal_scan_source" AS ENUM('UPLOAD', 'FOLDER', 'WEBDAV');--> statement-breakpoint
ALTER TABLE "postal_scan" ALTER COLUMN "source" SET DATA TYPE "postal_scan_source" USING "source"::"postal_scan_source";--> statement-breakpoint
ALTER TABLE "scanner_access" DROP COLUMN "team_member_id";--> statement-breakpoint
CREATE INDEX "scan_delivery_user_id_idx" ON "scan_delivery" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "scan_task_delivery_id_kind_page_key" ON "scan_task" ("delivery_id","kind","page");--> statement-breakpoint
CREATE INDEX "scan_task_due_at_idx" ON "scan_task" ("due_at") WHERE ("done_at" is null);--> statement-breakpoint
CREATE INDEX "scan_task_file_id_idx" ON "scan_task" ("file_id");--> statement-breakpoint
CREATE INDEX "scanner_access_user_id_idx" ON "scanner_access" ("user_id");--> statement-breakpoint
ALTER TABLE "scan_delivery" ADD CONSTRAINT "scan_delivery_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "scan_task" ADD CONSTRAINT "scan_task_delivery_id_scan_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "scan_delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "scan_task" ADD CONSTRAINT "scan_task_file_id_stored_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_file"("id") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "scanner_access" ADD CONSTRAINT "scanner_access_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;