-- Hand-edited on top of drizzle-kit's output: the trigram operator class needs the extension.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE INDEX "delegation_id_trgm" ON "delegation" USING gin ("id" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "delegation_school_trgm" ON "delegation" USING gin ("school" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "payment_transaction_id_trgm" ON "payment_transaction" USING gin ("id" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_id_trgm" ON "user" USING gin ("id" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_email_trgm" ON "user" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_given_name_trgm" ON "user" USING gin ("given_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_family_name_trgm" ON "user" USING gin ("family_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_preferred_username_trgm" ON "user" USING gin ("preferred_username" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_locale_trgm" ON "user" USING gin ("locale" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_pronouns_trgm" ON "user" USING gin ("pronouns" gin_trgm_ops);