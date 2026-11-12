DROP INDEX "conference_participant_conference_id_idx";--> statement-breakpoint
CREATE INDEX "conference_participant_conference_id_id_idx" ON "conference_participant" ("conference_id","id");--> statement-breakpoint
CREATE INDEX "waiting_list_entry_conference_id_id_idx" ON "waiting_list_entry" ("conference_id","id");