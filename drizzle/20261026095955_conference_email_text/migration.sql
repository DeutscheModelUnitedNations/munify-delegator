CREATE TABLE "conference_email_text" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"conference_id" text NOT NULL,
	"kind" "email_kind" NOT NULL,
	"locale" text NOT NULL,
	"subject" text,
	"heading" text,
	"body" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "conference_email_text_conference_id_kind_locale_key" ON "conference_email_text" ("conference_id","kind","locale");--> statement-breakpoint
ALTER TABLE "conference_email_text" ADD CONSTRAINT "conference_email_text_conference_id_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;