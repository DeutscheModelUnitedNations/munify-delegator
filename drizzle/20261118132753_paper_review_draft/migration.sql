CREATE TYPE "paper_review_draft_origin" AS ENUM('MCP', 'UI');--> statement-breakpoint
CREATE TABLE "paper_review_draft" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"paper_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"paper_version_id" text NOT NULL,
	"comments" jsonb NOT NULL,
	"status_after" "paper_status" NOT NULL,
	"origin" "paper_review_draft_origin" NOT NULL,
	"last_edited_via" "paper_review_draft_origin" NOT NULL,
	CONSTRAINT "paper_review_draft_status_after_verdict" CHECK ("status_after"::text in ('CHANGES_REQUESTED', 'ACCEPTED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "paper_review_draft_paper_id_reviewer_id_key" ON "paper_review_draft" ("paper_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "paper_review_draft_reviewer_id_idx" ON "paper_review_draft" ("reviewer_id");--> statement-breakpoint
ALTER TABLE "paper_review_draft" ADD CONSTRAINT "paper_review_draft_paper_id_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "paper_review_draft" ADD CONSTRAINT "paper_review_draft_reviewer_id_user_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "paper_review_draft" ADD CONSTRAINT "paper_review_draft_paper_version_id_paper_version_id_fkey" FOREIGN KEY ("paper_version_id") REFERENCES "paper_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;