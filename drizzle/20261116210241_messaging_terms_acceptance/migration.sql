CREATE TABLE "messaging_terms_acceptance" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"user_id" text NOT NULL,
	"version" integer NOT NULL,
	"revision" integer NOT NULL,
	"locale" text,
	"content_hash" text,
	"confirmation_ids" text[] NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "messaging_terms_acceptance_user_id_version_revision_key" ON "messaging_terms_acceptance" ("user_id","version","revision");--> statement-breakpoint
ALTER TABLE "messaging_terms_acceptance" ADD CONSTRAINT "messaging_terms_acceptance_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;