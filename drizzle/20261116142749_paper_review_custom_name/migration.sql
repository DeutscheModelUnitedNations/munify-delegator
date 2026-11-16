ALTER TYPE "paper_review_anonymous_as" ADD VALUE 'CUSTOM';--> statement-breakpoint
ALTER TABLE "paper_review" ADD COLUMN "anonymous_name" text;--> statement-breakpoint
ALTER TABLE "paper_review" ADD CONSTRAINT "paper_review_anonymous_name_iff_custom" CHECK (("anonymous_as"::text is not distinct from 'CUSTOM') = ("anonymous_name" is not null));