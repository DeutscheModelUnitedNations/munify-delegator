CREATE INDEX "delegation_entry_code_trgm" ON "delegation" USING gin ("entry_code" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "delegation_motivation_trgm" ON "delegation" USING gin ("motivation" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "delegation_experience_trgm" ON "delegation" USING gin ("experience" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "delegation_conference_id_created_at_idx" ON "delegation" ("conference_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "single_participant_id_trgm" ON "single_participant" USING gin ("id" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "single_participant_school_trgm" ON "single_participant" USING gin ("school" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "single_participant_motivation_trgm" ON "single_participant" USING gin ("motivation" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "single_participant_experience_trgm" ON "single_participant" USING gin ("experience" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "single_participant_conference_id_created_at_idx" ON "single_participant" ("conference_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "waiting_list_entry_school_trgm" ON "waiting_list_entry" USING gin ("school" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "waiting_list_entry_experience_trgm" ON "waiting_list_entry" USING gin ("experience" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "waiting_list_entry_motivation_trgm" ON "waiting_list_entry" USING gin ("motivation" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "waiting_list_entry_requests_trgm" ON "waiting_list_entry" USING gin ("requests" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "waiting_list_entry_conference_id_assigned_created_at_idx" ON "waiting_list_entry" ("conference_id","assigned","created_at");