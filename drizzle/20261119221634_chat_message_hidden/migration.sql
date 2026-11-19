ALTER TABLE "chat_message" ADD COLUMN "hidden_at" timestamp(3);--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "hidden_by_id" text;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "hidden_report_id" text;--> statement-breakpoint
CREATE INDEX "chat_message_hidden_report_id_idx" ON "chat_message" ("hidden_report_id");--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_hidden_by_id_user_id_fkey" FOREIGN KEY ("hidden_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_hidden_report_id_chat_report_id_fkey" FOREIGN KEY ("hidden_report_id") REFERENCES "chat_report"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_hidden_reason" CHECK (("hidden_at" is null) = ("hidden_reason" is null));--> statement-breakpoint

-- A message is evidence: its text never changes, and once participant care hid it, the hiding is
-- final. Who hid it and under which report may only fall away with their rows (`set null`).
CREATE FUNCTION chat_message_hidden_is_final() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF TG_OP = 'INSERT' THEN
		IF EXISTS (SELECT 1 FROM chat WHERE id = NEW.chat_id AND kind = 'TEAM') THEN
			RAISE EXCEPTION 'a message of a team chat cannot be hidden'
				USING ERRCODE = 'check_violation', CONSTRAINT = 'chat_message_hidden_not_in_team_chat';
		END IF;
		RETURN NEW;
	END IF;
	IF NEW.body IS DISTINCT FROM OLD.body THEN
		RAISE EXCEPTION 'the text of a chat message cannot change'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'chat_message_body_immutable';
	END IF;
	IF OLD.hidden_at IS NOT NULL AND (
		NEW.hidden_at IS DISTINCT FROM OLD.hidden_at
		OR NEW.hidden_reason IS DISTINCT FROM OLD.hidden_reason
		OR (NEW.hidden_by_id IS NOT NULL AND NEW.hidden_by_id IS DISTINCT FROM OLD.hidden_by_id)
		OR (NEW.hidden_report_id IS NOT NULL AND NEW.hidden_report_id IS DISTINCT FROM OLD.hidden_report_id)
	) THEN
		RAISE EXCEPTION 'a hidden chat message stays hidden'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'chat_message_hidden_is_final';
	END IF;
	-- only the messages between participants are moderated; a team chat is its inbox's
	IF OLD.hidden_at IS NULL AND NEW.hidden_at IS NOT NULL
		AND EXISTS (SELECT 1 FROM chat WHERE id = NEW.chat_id AND kind = 'TEAM') THEN
		RAISE EXCEPTION 'a message of a team chat cannot be hidden'
			USING ERRCODE = 'check_violation', CONSTRAINT = 'chat_message_hidden_not_in_team_chat';
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "chat_message_hidden_is_final" BEFORE UPDATE ON "chat_message"
	FOR EACH ROW EXECUTE FUNCTION chat_message_hidden_is_final();--> statement-breakpoint
-- written hidden from the start (the dev seed), the same holds
CREATE TRIGGER "chat_message_hidden_not_in_team_chat" BEFORE INSERT ON "chat_message"
	FOR EACH ROW WHEN (NEW.hidden_at IS NOT NULL)
	EXECUTE FUNCTION chat_message_hidden_is_final();
