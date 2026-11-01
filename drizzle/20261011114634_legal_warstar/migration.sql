CREATE TABLE "search_history" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" text NOT NULL,
	"conference_id" text NOT NULL,
	"origin_id" text NOT NULL,
	"result_id" text NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "search_history_user_id_idx" ON "search_history" ("user_id");--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;