CREATE TYPE "chat_inbox" AS ENUM('PARTICIPANT_CARE', 'CHAIR', 'CONSULTANT');--> statement-breakpoint
CREATE TYPE "chat_kind" AS ENUM('DIRECT', 'DELEGATION', 'TEAM');--> statement-breakpoint
CREATE TYPE "chat_report_status" AS ENUM('OPEN', 'RESOLVED');--> statement-breakpoint
CREATE TYPE "team_function_kind" AS ENUM('CHAIR', 'CONSULTANT');--> statement-breakpoint
ALTER TYPE "email_kind" ADD VALUE 'UNREAD_MESSAGES';--> statement-breakpoint
CREATE TABLE "chat" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"kind" "chat_kind" NOT NULL,
	"participant_id" text,
	"other_participant_id" text,
	"delegation_id" text,
	"inbox" "chat_inbox",
	"committee_id" text,
	"last_message_at" timestamp(3),
	"last_participant_message_at" timestamp(3),
	"team_read_at" timestamp(3),
	"under_review" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_block" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"blocker_participant_id" text NOT NULL,
	"blocked_participant_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"chat_id" text NOT NULL,
	"author_participant_id" text,
	"team_author_user_id" text,
	"from_team" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"paper_id" text
);
--> statement-breakpoint
CREATE TABLE "chat_read" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"chat_id" text NOT NULL,
	"user_id" text NOT NULL,
	"read_at" timestamp(3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_report" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"chat_id" text NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" "chat_report_status" DEFAULT 'OPEN'::"chat_report_status" NOT NULL,
	"resolved_by_id" text,
	"resolved_at" timestamp(3)
);
--> statement-breakpoint
CREATE TABLE "team_function" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"team_member_id" text NOT NULL,
	"committee_id" text NOT NULL,
	"kind" "team_function_kind" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "messaging_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conference_participant" ADD COLUMN "messaging_suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "message_notification_emails" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_direct_key" ON "chat" ("participant_id","other_participant_id") WHERE "kind" = 'DIRECT';--> statement-breakpoint
CREATE UNIQUE INDEX "chat_delegation_key" ON "chat" ("delegation_id") WHERE "kind" = 'DELEGATION';--> statement-breakpoint
CREATE UNIQUE INDEX "chat_team_care_key" ON "chat" ("participant_id") WHERE "kind" = 'TEAM' and "inbox" = 'PARTICIPANT_CARE';--> statement-breakpoint
CREATE UNIQUE INDEX "chat_team_committee_key" ON "chat" ("participant_id","inbox","committee_id") WHERE "kind" = 'TEAM' and "inbox" <> 'PARTICIPANT_CARE';--> statement-breakpoint
CREATE INDEX "chat_conference_id_last_message_at_idx" ON "chat" ("conference_id","last_message_at");--> statement-breakpoint
CREATE INDEX "chat_other_participant_id_idx" ON "chat" ("other_participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_block_blocker_blocked_key" ON "chat_block" ("blocker_participant_id","blocked_participant_id");--> statement-breakpoint
CREATE INDEX "chat_block_blocked_participant_id_idx" ON "chat_block" ("blocked_participant_id");--> statement-breakpoint
CREATE INDEX "chat_message_chat_id_created_at_idx" ON "chat_message" ("chat_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_read_chat_id_user_id_key" ON "chat_read" ("chat_id","user_id");--> statement-breakpoint
CREATE INDEX "chat_report_conference_id_status_idx" ON "chat_report" ("conference_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "team_function_team_member_id_committee_id_kind_key" ON "team_function" ("team_member_id","committee_id","kind");--> statement-breakpoint
CREATE INDEX "team_function_committee_id_idx" ON "team_function" ("committee_id");--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_participant_id_conference_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "conference_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_other_participant_id_conference_participant_id_fkey" FOREIGN KEY ("other_participant_id") REFERENCES "conference_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_delegation_id_delegation_id_fkey" FOREIGN KEY ("delegation_id") REFERENCES "delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_committee_id_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_block" ADD CONSTRAINT "chat_block_t40CSrCbN5iI_fkey" FOREIGN KEY ("blocker_participant_id") REFERENCES "conference_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_block" ADD CONSTRAINT "chat_block_eG7IjLLNTq10_fkey" FOREIGN KEY ("blocked_participant_id") REFERENCES "conference_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_chat_id_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_CD76HohJrgfx_fkey" FOREIGN KEY ("author_participant_id") REFERENCES "conference_participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_team_author_user_id_user_id_fkey" FOREIGN KEY ("team_author_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_paper_id_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "paper"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_read" ADD CONSTRAINT "chat_read_chat_id_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_read" ADD CONSTRAINT "chat_read_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_report" ADD CONSTRAINT "chat_report_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_report" ADD CONSTRAINT "chat_report_chat_id_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_report" ADD CONSTRAINT "chat_report_reporter_user_id_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_report" ADD CONSTRAINT "chat_report_resolved_by_id_user_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "team_function" ADD CONSTRAINT "team_function_team_member_id_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "team_function" ADD CONSTRAINT "team_function_committee_id_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
-- A chat's people, delegation and committee are of its conference, and a team function names a
-- committee of the team member's conference (`assert_same_conference`, from the `conference_anchor`
-- migration).
CREATE FUNCTION "chat_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		NEW.conference_id,
		(SELECT conference_id FROM conference_participant WHERE id = NEW.participant_id),
		(SELECT conference_id FROM conference_participant WHERE id = NEW.other_participant_id),
		(SELECT conference_id FROM delegation WHERE id = NEW.delegation_id),
		(SELECT conference_id FROM committee WHERE id = NEW.committee_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "chat_same_conference" AFTER INSERT OR UPDATE ON "chat"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "chat_same_conference"();--> statement-breakpoint
CREATE FUNCTION "team_function_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM team_member WHERE id = NEW.team_member_id),
		(SELECT conference_id FROM committee WHERE id = NEW.committee_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "team_function_same_conference" AFTER INSERT OR UPDATE ON "team_function"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "team_function_same_conference"();--> statement-breakpoint
-- A chat stays in its conference.
CREATE FUNCTION "chat_reach_unchanged"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NEW.conference_id IS DISTINCT FROM OLD.conference_id THEN
		RAISE EXCEPTION 'a chat row cannot change its conference'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'chat_conference_id_is_immutable';
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "chat_conference_id_is_immutable" BEFORE UPDATE ON "chat"
	FOR EACH ROW EXECUTE FUNCTION "chat_reach_unchanged"();
