CREATE TYPE "notification_channel" AS ENUM('EMAIL', 'SLACK');--> statement-breakpoint
CREATE TYPE "notification_topic" AS ENUM('PARTICIPANT_CARE', 'COMMITTEE_INBOX', 'TRUSTED_SHARED', 'TRUSTED_PERSONAL', 'CHAT_REPORT');--> statement-breakpoint
ALTER TYPE "email_kind" ADD VALUE 'CHAT_REPORTED';--> statement-breakpoint
CREATE TABLE "conference_slack_workspace" (
	"conference_id" text PRIMARY KEY,
	"slack_workspace_id" text NOT NULL,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preference" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"team_member_id" text NOT NULL,
	"topic" "notification_topic" NOT NULL,
	"team_function_id" text,
	"channel" "notification_channel" NOT NULL,
	"enabled" boolean NOT NULL,
	CONSTRAINT "notification_preference_key" UNIQUE NULLS NOT DISTINCT("team_member_id","topic","team_function_id","channel"),
	CONSTRAINT "notification_preference_function_check" CHECK (("topic" = 'COMMITTEE_INBOX') = ("team_function_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "slack_notification" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"team_member_id" text NOT NULL,
	"inbox_key" text NOT NULL,
	"subject_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slack_user_lookup" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"slack_workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"looked_up_email" text NOT NULL,
	"slack_user_id" text,
	"checked_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slack_workspace" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"name" text NOT NULL,
	"slack_team_id" text NOT NULL,
	"slack_team_name" text NOT NULL,
	"bot_token_ciphertext" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "slack_notification_team_member_id_inbox_key_idx" ON "slack_notification" ("team_member_id","inbox_key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "slack_user_lookup_workspace_id_user_id_key" ON "slack_user_lookup" ("slack_workspace_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "slack_workspace_slack_team_id_key" ON "slack_workspace" ("slack_team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_function_id_team_member_id_key" ON "team_function" ("id","team_member_id");--> statement-breakpoint
ALTER TABLE "conference_slack_workspace" ADD CONSTRAINT "conference_slack_workspace_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "conference_slack_workspace" ADD CONSTRAINT "conference_slack_workspace_cIvqnDIcE4h5_fkey" FOREIGN KEY ("slack_workspace_id") REFERENCES "slack_workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_team_member_id_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_team_function_fkey" FOREIGN KEY ("team_function_id","team_member_id") REFERENCES "team_function"("id","team_member_id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "slack_notification" ADD CONSTRAINT "slack_notification_team_member_id_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "slack_user_lookup" ADD CONSTRAINT "slack_user_lookup_slack_workspace_id_slack_workspace_id_fkey" FOREIGN KEY ("slack_workspace_id") REFERENCES "slack_workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "slack_user_lookup" ADD CONSTRAINT "slack_user_lookup_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;