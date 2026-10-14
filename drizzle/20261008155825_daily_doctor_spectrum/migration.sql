CREATE INDEX "user_street_trgm" ON "user" USING gin ("street" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_apartment_trgm" ON "user" USING gin ("apartment" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_zip_trgm" ON "user" USING gin ("zip" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_city_trgm" ON "user" USING gin ("city" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_region_trgm" ON "user" USING gin ("region" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_country_trgm" ON "user" USING gin ("country" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_phone_trgm" ON "user" USING gin ("phone" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_emergency_contacts_trgm" ON "user" USING gin ("emergency_contacts" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "user_global_notes_trgm" ON "user" USING gin ("global_notes" gin_trgm_ops);