CREATE TYPE "attendance_session_mode" AS ENUM('CHECK', 'RECORD', 'BADGE');--> statement-breakpoint
ALTER TABLE "attendance_session" ADD COLUMN "mode" "attendance_session_mode" DEFAULT 'RECORD'::"attendance_session_mode" NOT NULL;--> statement-breakpoint
ALTER TABLE "attendance_session" DROP COLUMN "check_mode";--> statement-breakpoint
ALTER TABLE "attendance_session" DROP COLUMN "collects_access_cards";