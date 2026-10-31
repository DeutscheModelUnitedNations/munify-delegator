CREATE TYPE "possible_duplicate_status" AS ENUM('OPEN', 'DISMISSED', 'CONFIRMED');--> statement-breakpoint
CREATE TABLE "possible_duplicate" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" text NOT NULL,
	"candidate_id" text NOT NULL,
	"score" double precision NOT NULL,
	"reasons" text[] NOT NULL,
	"status" "possible_duplicate_status" DEFAULT 'OPEN'::"possible_duplicate_status" NOT NULL,
	"decided_by_id" text,
	"decided_at" timestamp(3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "possible_duplicate_user_id_candidate_id_key" ON "possible_duplicate" ("user_id","candidate_id");--> statement-breakpoint
CREATE INDEX "possible_duplicate_candidate_id_idx" ON "possible_duplicate" ("candidate_id");--> statement-breakpoint
ALTER TABLE "possible_duplicate" ADD CONSTRAINT "possible_duplicate_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "possible_duplicate" ADD CONSTRAINT "possible_duplicate_candidate_id_user_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "possible_duplicate" ADD CONSTRAINT "possible_duplicate_decided_by_id_user_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;