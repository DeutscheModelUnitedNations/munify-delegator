CREATE TYPE "paper_review_anonymous_as" AS ENUM('SECRETARIAT', 'RESEARCH_SERVICE');--> statement-breakpoint
ALTER TABLE "paper_review" ADD COLUMN "anonymous_as" "paper_review_anonymous_as";