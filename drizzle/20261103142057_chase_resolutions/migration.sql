ALTER TABLE "resolution" ADD COLUMN "chase_paper_id" text;--> statement-breakpoint
ALTER TABLE "resolution" ADD COLUMN "chase_snapshot_id" text;--> statement-breakpoint
ALTER TABLE "resolution" ADD CONSTRAINT "resolution_chase_paper_id_key" UNIQUE("chase_paper_id");