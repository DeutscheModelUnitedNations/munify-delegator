ALTER TABLE "committee_to_nation" DROP CONSTRAINT "committee_to_nation_ab_pkey";--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_delegation_member" DROP CONSTRAINT "conference_supervisor_to_delegation_member_ab_pkey";--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_single_participant" DROP CONSTRAINT "conference_supervisor_to_single_participant_ab_pkey";--> statement-breakpoint
ALTER TABLE "custom_conference_role_to_single_participant" DROP CONSTRAINT "custom_conference_role_to_single_participant_ab_pkey";--> statement-breakpoint
ALTER TABLE "committee_to_nation" ADD COLUMN "id" text;--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_delegation_member" ADD COLUMN "id" text;--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_single_participant" ADD COLUMN "id" text;--> statement-breakpoint
ALTER TABLE "custom_conference_role_to_single_participant" ADD COLUMN "id" text;--> statement-breakpoint
-- Backfill required before the primary keys below: drizzle emits a nullable column and
-- the nanoid default is applied by the application, not the database, so existing rows
-- would still be NULL and ADD PRIMARY KEY would fail. Existing join rows therefore get
-- uuid-shaped ids while new rows get nanoids; both are opaque text.
--> statement-breakpoint
UPDATE "committee_to_nation" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
--> statement-breakpoint
UPDATE "conference_supervisor_to_delegation_member" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
--> statement-breakpoint
UPDATE "conference_supervisor_to_single_participant" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
--> statement-breakpoint
UPDATE "custom_conference_role_to_single_participant" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
--> statement-breakpoint
ALTER TABLE "committee_to_nation" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_delegation_member" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "conference_supervisor_to_single_participant" ADD PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "custom_conference_role_to_single_participant" ADD PRIMARY KEY ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "committee_to_nation_ab_key" ON "committee_to_nation" ("a","b");--> statement-breakpoint
CREATE UNIQUE INDEX "conference_supervisor_to_delegation_member_ab_key" ON "conference_supervisor_to_delegation_member" ("a","b");--> statement-breakpoint
CREATE UNIQUE INDEX "conference_supervisor_to_single_participant_ab_key" ON "conference_supervisor_to_single_participant" ("a","b");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_conference_role_to_single_participant_ab_key" ON "custom_conference_role_to_single_participant" ("a","b");