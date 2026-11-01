CREATE TABLE "conference_email_footer" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"locale" text NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "conference_email_footer_conference_id_locale_key" ON "conference_email_footer" ("conference_id","locale");--> statement-breakpoint
ALTER TABLE "conference_email_footer" ADD CONSTRAINT "conference_email_footer_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;