ALTER TYPE "chat_inbox" ADD VALUE 'ROLE_SUPPORT';--> statement-breakpoint
ALTER TYPE "chat_kind" ADD VALUE 'COMMITTEE';--> statement-breakpoint
ALTER TYPE "chat_kind" ADD VALUE 'ROLE';--> statement-breakpoint
ALTER TYPE "team_function_kind" ADD VALUE 'ROLE_SUPPORT';--> statement-breakpoint
ALTER TYPE "notification_topic" ADD VALUE 'ROLE_INBOX';--> statement-breakpoint
ALTER TYPE "notification_topic" ADD VALUE 'CHAT_GROUP';--> statement-breakpoint
CREATE TABLE "chat_mute" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "role_id" text;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "group_chats_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_function" ADD COLUMN "role_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "group_message_notification_emails" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DROP INDEX "chat_team_committee_key";--> statement-breakpoint
CREATE UNIQUE INDEX "chat_team_committee_key" ON "chat" ("participant_id","inbox","committee_id") WHERE "kind" = 'TEAM' and "inbox" in ('CHAIR', 'CONSULTANT');--> statement-breakpoint
DROP INDEX "chat_team_trusted_key";--> statement-breakpoint
CREATE UNIQUE INDEX "chat_team_trusted_key" ON "chat" ("participant_id") WHERE "kind" = 'TEAM' and "inbox" = 'TRUSTED_PERSON' and "trusted_user_id" is null;--> statement-breakpoint
DROP INDEX "team_function_team_member_id_kind_key";--> statement-breakpoint
CREATE UNIQUE INDEX "team_function_team_member_id_kind_key" ON "team_function" ("team_member_id","kind") WHERE "committee_id" is null and "role_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_team_role_key" ON "chat" ("participant_id","role_id") WHERE "kind" = 'TEAM' and "role_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_committee_key" ON "chat" ("committee_id") WHERE "kind" <> 'TEAM' and "committee_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_role_key" ON "chat" ("role_id") WHERE "kind" <> 'TEAM' and "role_id" is not null;--> statement-breakpoint
CREATE INDEX "chat_role_id_idx" ON "chat" ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_mute_chat_id_user_id_key" ON "chat_mute" ("chat_id","user_id");--> statement-breakpoint
CREATE INDEX "chat_mute_user_id_idx" ON "chat_mute" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_function_team_member_id_role_id_kind_key" ON "team_function" ("team_member_id","role_id","kind") WHERE "role_id" is not null;--> statement-breakpoint
CREATE INDEX "team_function_role_id_idx" ON "team_function" ("role_id");--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_role_id_conference_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "conference_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_mute" ADD CONSTRAINT "chat_mute_chat_id_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_mute" ADD CONSTRAINT "chat_mute_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "team_function" ADD CONSTRAINT "team_function_role_id_conference_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "conference_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
-- A chat's and a team function's custom role is of their conference (`assert_same_conference`),
-- and a custom role it is (`assert_role_kind`): the groups and inboxes of roles are the custom
-- roles', nations and non-state actors have their delegations.
CREATE OR REPLACE FUNCTION "chat_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		NEW.conference_id,
		(SELECT conference_id FROM conference_participant WHERE id = NEW.participant_id),
		(SELECT conference_id FROM conference_participant WHERE id = NEW.other_participant_id),
		(SELECT conference_id FROM delegation WHERE id = NEW.delegation_id),
		(SELECT conference_id FROM committee WHERE id = NEW.committee_id),
		(SELECT conference_id FROM conference_role WHERE id = NEW.role_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "team_function_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM team_member WHERE id = NEW.team_member_id),
		(SELECT conference_id FROM committee WHERE id = NEW.committee_id),
		(SELECT conference_id FROM conference_role WHERE id = NEW.role_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE FUNCTION "chat_role_kind"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_role_kind(TG_TABLE_NAME, NEW.role_id, ARRAY['CUSTOM']::conference_role_kind[]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER "chat_role_kind" AFTER INSERT OR UPDATE OF "role_id" ON "chat"
	FOR EACH ROW EXECUTE FUNCTION "chat_role_kind"();--> statement-breakpoint
CREATE FUNCTION "team_function_role_kind"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_role_kind(TG_TABLE_NAME, NEW.role_id, ARRAY['CUSTOM']::conference_role_kind[]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE TRIGGER "team_function_role_kind" AFTER INSERT OR UPDATE OF "role_id" ON "team_function"
	FOR EACH ROW EXECUTE FUNCTION "team_function_role_kind"();
