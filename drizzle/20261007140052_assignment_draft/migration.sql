-- Hand-edited on top of drizzle-kit's output: the backfill at the end releases the assignment of
-- every conference already past registration, whose participants saw their roles before the
-- release toggle existed and must keep seeing them.
CREATE TABLE "assignment_review" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"delegation_id" text,
	"single_participant_id" text,
	"evaluation" double precision,
	"flagged" boolean DEFAULT false NOT NULL,
	"disqualified" boolean DEFAULT false NOT NULL,
	"note" text,
	CONSTRAINT "assignment_review_one_application" CHECK (num_nonnulls("delegation_id", "single_participant_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "assignment_single_role" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"single_participant_id" text NOT NULL,
	"role_id" text
);
--> statement-breakpoint
CREATE TABLE "assignment_unit" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"source_delegation_id" text,
	"source_single_participant_id" text,
	"nation_alpha3_code" text,
	"non_state_actor_id" text,
	CONSTRAINT "assignment_unit_one_source" CHECK (num_nonnulls("source_delegation_id", "source_single_participant_id") = 1),
	CONSTRAINT "assignment_unit_one_role" CHECK (num_nonnulls("nation_alpha3_code", "non_state_actor_id") <= 1)
);
--> statement-breakpoint
CREATE TABLE "assignment_unit_member" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"unit_id" text NOT NULL,
	"delegation_member_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_weights" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"null_rating" double precision DEFAULT 2.5 NOT NULL,
	"rating_factor" double precision DEFAULT 1 NOT NULL,
	"mark_bonus" double precision DEFAULT 0 NOT NULL,
	"non_wish_malus" double precision DEFAULT 50 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "assignment_released" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "conference" ADD COLUMN "assignment_released_at" timestamp(3);--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_review_delegation_id_key" ON "assignment_review" ("delegation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_review_single_participant_id_key" ON "assignment_review" ("single_participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_single_role_single_participant_id_key" ON "assignment_single_role" ("single_participant_id");--> statement-breakpoint
CREATE INDEX "assignment_unit_conference_id_idx" ON "assignment_unit" ("conference_id");--> statement-breakpoint
CREATE INDEX "assignment_unit_source_delegation_id_idx" ON "assignment_unit" ("source_delegation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_unit_source_single_participant_id_key" ON "assignment_unit" ("source_single_participant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_unit_member_delegation_member_id_key" ON "assignment_unit_member" ("delegation_member_id");--> statement-breakpoint
CREATE INDEX "assignment_unit_member_unit_id_idx" ON "assignment_unit_member" ("unit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_weights_conference_id_key" ON "assignment_weights" ("conference_id");--> statement-breakpoint
ALTER TABLE "assignment_review" ADD CONSTRAINT "assignment_review_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_review" ADD CONSTRAINT "assignment_review_delegation_id_delegation_id_fkey" FOREIGN KEY ("delegation_id") REFERENCES "delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_review" ADD CONSTRAINT "assignment_review_awDbhFSQb3ns_fkey" FOREIGN KEY ("single_participant_id") REFERENCES "single_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_single_role" ADD CONSTRAINT "assignment_single_role_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_single_role" ADD CONSTRAINT "assignment_single_role_eAcqIilt9cYD_fkey" FOREIGN KEY ("single_participant_id") REFERENCES "single_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_single_role" ADD CONSTRAINT "assignment_single_role_role_id_custom_conference_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "custom_conference_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_unit" ADD CONSTRAINT "assignment_unit_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_unit" ADD CONSTRAINT "assignment_unit_source_delegation_id_delegation_id_fkey" FOREIGN KEY ("source_delegation_id") REFERENCES "delegation"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_unit" ADD CONSTRAINT "assignment_unit_Vf1xYa1J6CsM_fkey" FOREIGN KEY ("source_single_participant_id") REFERENCES "single_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_unit" ADD CONSTRAINT "assignment_unit_nation_alpha3_code_nation_alpha3_code_fkey" FOREIGN KEY ("nation_alpha3_code") REFERENCES "nation"("alpha3_code") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_unit" ADD CONSTRAINT "assignment_unit_non_state_actor_id_non_state_actor_id_fkey" FOREIGN KEY ("non_state_actor_id") REFERENCES "non_state_actor"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_unit_member" ADD CONSTRAINT "assignment_unit_member_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_unit_member" ADD CONSTRAINT "assignment_unit_member_unit_id_assignment_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "assignment_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_unit_member" ADD CONSTRAINT "assignment_unit_member_iTbbuvtMR3xn_fkey" FOREIGN KEY ("delegation_member_id") REFERENCES "delegation_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "assignment_weights" ADD CONSTRAINT "assignment_weights_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
UPDATE "conference" SET "assignment_released" = true, "assignment_released_at" = CURRENT_TIMESTAMP WHERE "state" IN ('PREPARATION', 'ACTIVE', 'POST');
