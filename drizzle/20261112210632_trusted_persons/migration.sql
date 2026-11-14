ALTER TYPE "chat_inbox" ADD VALUE 'TRUSTED_PERSON';--> statement-breakpoint
ALTER TYPE "team_function_kind" ADD VALUE 'TRUSTED_PERSON';--> statement-breakpoint
ALTER TABLE "chat" ADD COLUMN "trusted_user_id" text;--> statement-breakpoint
ALTER TABLE "team_function" ALTER COLUMN "committee_id" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_team_trusted_key" ON "chat" ("participant_id") WHERE "kind" = 'TEAM' and "inbox" <> 'PARTICIPANT_CARE' and "committee_id" is null and "trusted_user_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_team_trusted_person_key" ON "chat" ("participant_id","trusted_user_id") WHERE "trusted_user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "team_function_team_member_id_kind_key" ON "team_function" ("team_member_id","kind") WHERE "committee_id" is null;--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_trusted_user_id_user_id_fkey" FOREIGN KEY ("trusted_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;