DROP INDEX "school_suggestion_variant_suggestion_id_school_key";--> statement-breakpoint
DROP INDEX "delegation_school_trgm";--> statement-breakpoint
DROP INDEX "single_participant_school_trgm";--> statement-breakpoint
DROP INDEX "waiting_list_entry_school_trgm";--> statement-breakpoint
ALTER TABLE "school_suggestion_variant" ADD COLUMN "school_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "school_suggestion_variant" DROP COLUMN "school";--> statement-breakpoint
ALTER TABLE "delegation" DROP COLUMN "school";--> statement-breakpoint
ALTER TABLE "single_participant" DROP COLUMN "school";--> statement-breakpoint
ALTER TABLE "waiting_list_entry" DROP COLUMN "school";--> statement-breakpoint
CREATE UNIQUE INDEX "school_suggestion_variant_suggestion_id_school_id_key" ON "school_suggestion_variant" ("suggestion_id","school_id");--> statement-breakpoint
ALTER TABLE "school_suggestion_variant" ADD CONSTRAINT "school_suggestion_variant_school_id_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE ON UPDATE CASCADE;