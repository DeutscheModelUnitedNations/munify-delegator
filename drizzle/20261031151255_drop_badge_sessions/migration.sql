ALTER TABLE "attendance_session" ALTER COLUMN "mode" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "attendance_session" ALTER COLUMN "mode" DROP DEFAULT;--> statement-breakpoint
-- Sessions that handed out cards checked as well; they carry on as checking sessions
UPDATE "attendance_session" SET "mode" = 'CHECK' WHERE "mode" = 'BADGE';--> statement-breakpoint
DROP TYPE "attendance_session_mode";--> statement-breakpoint
CREATE TYPE "attendance_session_mode" AS ENUM('CHECK', 'RECORD');--> statement-breakpoint
ALTER TABLE "attendance_session" ALTER COLUMN "mode" SET DATA TYPE "attendance_session_mode" USING "mode"::"attendance_session_mode";--> statement-breakpoint
ALTER TABLE "attendance_session" ALTER COLUMN "mode" SET DEFAULT 'RECORD'::"attendance_session_mode";