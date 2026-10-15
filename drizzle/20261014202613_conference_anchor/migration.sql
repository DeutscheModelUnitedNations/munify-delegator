-- Every person in a conference is referenced through their `conference_participant` row, and no
-- row says which conference it is in twice: registrations, papers, payments and survey answers lose
-- their own `conference_id` / `user_id`. Integrity the dropped columns no longer give, and some
-- that was never there, comes from deferred constraint triggers: every row whose parents reach a
-- conference by two ways must reach the same one (`assert_same_conference`), checked at commit. A
-- `conference_id` that remains cannot change. Dropping a column drops its keys and indexes, so no
-- constraint is named here: databases from the Prisma era name them differently.

-- ---- An anchor row for everyone a paper, payment or answer names ------------------------
INSERT INTO "conference_participant" ("id", "conference_id", "user_id")
SELECT 'cp-' || md5(x.conference_id || ':' || x.user_id), x.conference_id, x.user_id
FROM (
	SELECT "conference_id", "author_id" AS user_id FROM "paper"
	UNION
	SELECT "conference_id", "user_id" FROM "payment_transaction"
	UNION
	SELECT t."conference_id", r."user_id"
	FROM "user_reference_in_payment_transaction" r
	JOIN "payment_transaction" t ON t."id" = r."payment_transaction_id"
	UNION
	SELECT q."conference_id", a."user_id"
	FROM "survey_answer" a
	JOIN "survey_question" q ON q."id" = a."question_id"
) x
ON CONFLICT ("user_id", "conference_id") DO NOTHING;--> statement-breakpoint

-- ---- The new references ------------------------------------------------------------------
ALTER TABLE "paper" ADD COLUMN "author_participant_id" text;--> statement-breakpoint
UPDATE "paper" t SET "author_participant_id" = p."id"
FROM "conference_participant" p WHERE p."conference_id" = t."conference_id" AND p."user_id" = t."author_id";--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD COLUMN "payer_participant_id" text;--> statement-breakpoint
UPDATE "payment_transaction" t SET "payer_participant_id" = p."id"
FROM "conference_participant" p WHERE p."conference_id" = t."conference_id" AND p."user_id" = t."user_id";--> statement-breakpoint
ALTER TABLE "user_reference_in_payment_transaction" ADD COLUMN "conference_participant_id" text;--> statement-breakpoint
UPDATE "user_reference_in_payment_transaction" r SET "conference_participant_id" = p."id"
FROM "payment_transaction" t, "conference_participant" p
WHERE t."id" = r."payment_transaction_id" AND p."conference_id" = t."conference_id" AND p."user_id" = r."user_id";--> statement-breakpoint
ALTER TABLE "survey_answer" ADD COLUMN "conference_participant_id" text;--> statement-breakpoint
UPDATE "survey_answer" a SET "conference_participant_id" = p."id"
FROM "survey_question" q, "conference_participant" p
WHERE q."id" = a."question_id" AND p."conference_id" = q."conference_id" AND p."user_id" = a."user_id";--> statement-breakpoint
ALTER TABLE "paper" ALTER COLUMN "author_participant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_transaction" ALTER COLUMN "payer_participant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_reference_in_payment_transaction" ALTER COLUMN "conference_participant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "survey_answer" ALTER COLUMN "conference_participant_id" SET NOT NULL;--> statement-breakpoint

-- ---- Unique guarantees, in place before the columns they replace go ---------------------
-- Connection codes become unique across conferences: a code used in several keeps it at its
-- oldest supervisor, the others draw a new one from the app's alphabet.
DO $$
DECLARE dup record; code text;
BEGIN
	FOR dup IN
		SELECT id FROM (
			SELECT id, row_number() OVER (PARTITION BY connection_code ORDER BY created_at, id) AS n
			FROM conference_supervisor
		) s WHERE n > 1
	LOOP
		LOOP
			SELECT string_agg(substr('6789BCDFGHJKLMNPQRTW', 1 + floor(random() * 20)::int, 1), '')
			INTO code FROM generate_series(1, 6);
			EXIT WHEN NOT EXISTS (SELECT 1 FROM conference_supervisor WHERE connection_code = code);
		END LOOP;
		UPDATE conference_supervisor SET connection_code = code WHERE id = dup.id;
	END LOOP;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX "conference_supervisor_connection_code_key" ON "conference_supervisor" ("connection_code");--> statement-breakpoint
-- One answer per person and question; the trigger below keeps question and person in one conference.
CREATE UNIQUE INDEX "survey_answer_question_id_conference_participant_id_key" ON "survey_answer" ("question_id","conference_participant_id");--> statement-breakpoint
-- `delegation_member`, `single_participant` and `conference_supervisor` already have a unique
-- `conference_participant_id`, and the participant row is unique per (user, conference): the
-- (conference_id, user_id) keys they lose below say nothing more. Checked here all the same.
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'delegation_member_conference_participant_id_key')
		OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'single_participant_conference_participant_id_key')
		OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'conference_supervisor_conference_participant_id_key')
		OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'conference_participant_user_id_conference_id_key')
	THEN
		RAISE EXCEPTION 'a unique key replacing the dropped (conference_id, user_id) keys is missing';
	END IF;
END $$;--> statement-breakpoint

-- ---- Views reading the old columns ------------------------------------------------------
-- Drops statistics_people, _registration_days, _ages, _addresses and _participant_status with it.
DROP VIEW "statistics_participation" CASCADE;--> statement-breakpoint
DROP MATERIALIZED VIEW "statistics_papers";--> statement-breakpoint

-- ---- The duplicated columns -------------------------------------------------------------
ALTER TABLE "delegation_member" DROP COLUMN "conference_id", DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "single_participant" DROP COLUMN "conference_id", DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "conference_supervisor" DROP COLUMN "conference_id", DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "paper" DROP COLUMN "conference_id", DROP COLUMN "author_id";--> statement-breakpoint
ALTER TABLE "payment_transaction" DROP COLUMN "conference_id", DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "user_reference_in_payment_transaction" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "survey_answer" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "assignment_unit_member" DROP COLUMN "conference_id";--> statement-breakpoint
ALTER TABLE "assignment_single_role" DROP COLUMN "conference_id";--> statement-breakpoint

ALTER TABLE "paper" ADD CONSTRAINT "paper_author_participant_id_conference_participant_id_fkey" FOREIGN KEY ("author_participant_id") REFERENCES "conference_participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_H8jNUST14QGs_fkey" FOREIGN KEY ("payer_participant_id") REFERENCES "conference_participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "survey_answer" ADD CONSTRAINT "survey_answer_K3XbnlS741x3_fkey" FOREIGN KEY ("conference_participant_id") REFERENCES "conference_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "user_reference_in_payment_transaction" ADD CONSTRAINT "user_reference_in_payment_transaction_WYUkM0Q7CaI5_fkey" FOREIGN KEY ("conference_participant_id") REFERENCES "conference_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
-- Plain indexes for the lookups the dropped keys used to serve, and for the new references
-- (the restrict and cascade checks, and the statistics views below, look rows up by them).
CREATE INDEX "conference_participant_conference_id_idx" ON "conference_participant" ("conference_id");--> statement-breakpoint
CREATE INDEX "delegation_member_delegation_id_idx" ON "delegation_member" ("delegation_id");--> statement-breakpoint
CREATE INDEX "paper_delegation_id_idx" ON "paper" ("delegation_id");--> statement-breakpoint
CREATE INDEX "paper_author_participant_id_idx" ON "paper" ("author_participant_id");--> statement-breakpoint
CREATE INDEX "payment_transaction_payer_participant_id_idx" ON "payment_transaction" ("payer_participant_id");--> statement-breakpoint
CREATE INDEX "survey_answer_conference_participant_id_idx" ON "survey_answer" ("conference_participant_id");--> statement-breakpoint
CREATE INDEX "user_reference_in_payment_transaction_payment_transaction_id_idx" ON "user_reference_in_payment_transaction" ("payment_transaction_id");--> statement-breakpoint
CREATE INDEX "user_reference_in_payment_transaction_conference_participant_id_idx" ON "user_reference_in_payment_transaction" ("conference_participant_id");--> statement-breakpoint

-- ---- Same conference, by trigger --------------------------------------------------------
-- Raises when the conferences a row reaches through its parents differ; a missing parent (an
-- optional reference, or a row deleted later in the transaction) is skipped.
CREATE FUNCTION assert_same_conference(tbl text, conference_ids text[]) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
	IF (SELECT count(DISTINCT id) FROM unnest(conference_ids) AS id WHERE id IS NOT NULL) > 1 THEN
		RAISE EXCEPTION 'a % row refers to rows of different conferences', tbl
			USING ERRCODE = 'check_violation', CONSTRAINT = tbl || '_same_conference';
	END IF;
END $$;--> statement-breakpoint
CREATE FUNCTION "delegation_member_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM delegation WHERE id = NEW.delegation_id),
		(SELECT conference_id FROM conference_participant WHERE id = NEW.conference_participant_id),
		(SELECT conference_id FROM committee WHERE id = NEW.assigned_committee_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "delegation_member_same_conference" AFTER INSERT OR UPDATE ON "delegation_member"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "delegation_member_same_conference"();--> statement-breakpoint
CREATE FUNCTION "single_participant_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM conference_participant WHERE id = NEW.conference_participant_id),
		(SELECT conference_id FROM conference_role WHERE id = NEW.assigned_role_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "single_participant_same_conference" AFTER INSERT OR UPDATE ON "single_participant"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "single_participant_same_conference"();--> statement-breakpoint
CREATE FUNCTION "paper_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM delegation WHERE id = NEW.delegation_id),
		(SELECT conference_id FROM conference_participant WHERE id = NEW.author_participant_id),
		(SELECT x.conference_id FROM committee_agenda_item c JOIN committee x ON x.id = c.committee_id WHERE c.id = NEW.agenda_item_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "paper_same_conference" AFTER INSERT OR UPDATE ON "paper"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "paper_same_conference"();--> statement-breakpoint
CREATE FUNCTION "user_reference_in_payment_transaction_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT x.conference_id FROM payment_transaction c JOIN conference_participant x ON x.id = c.payer_participant_id WHERE c.id = NEW.payment_transaction_id),
		(SELECT conference_id FROM conference_participant WHERE id = NEW.conference_participant_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "user_reference_in_payment_transaction_same_conference" AFTER INSERT OR UPDATE ON "user_reference_in_payment_transaction"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "user_reference_in_payment_transaction_same_conference"();--> statement-breakpoint
CREATE FUNCTION "survey_answer_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM survey_question WHERE id = NEW.question_id),
		(SELECT x.conference_id FROM survey_option c JOIN survey_question x ON x.id = c.question_id WHERE c.id = NEW.option_id),
		(SELECT conference_id FROM conference_participant WHERE id = NEW.conference_participant_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "survey_answer_same_conference" AFTER INSERT OR UPDATE ON "survey_answer"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "survey_answer_same_conference"();--> statement-breakpoint
CREATE FUNCTION "attendance_entry_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM attendance_session WHERE id = NEW.session_id),
		(SELECT conference_id FROM conference_participant WHERE id = NEW.conference_participant_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "attendance_entry_same_conference" AFTER INSERT OR UPDATE ON "attendance_entry"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "attendance_entry_same_conference"();--> statement-breakpoint
CREATE FUNCTION "supervision_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT x.conference_id FROM conference_supervisor c JOIN conference_participant x ON x.id = c.conference_participant_id WHERE c.id = NEW.a),
		(SELECT conference_id FROM conference_participant WHERE id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "supervision_same_conference" AFTER INSERT OR UPDATE ON "supervision"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "supervision_same_conference"();--> statement-breakpoint
CREATE FUNCTION "role_application_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM delegation WHERE id = NEW.delegation_id),
		(SELECT conference_id FROM conference_role WHERE id = NEW.role_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "role_application_same_conference" AFTER INSERT OR UPDATE ON "role_application"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "role_application_same_conference"();--> statement-breakpoint
CREATE FUNCTION "single_participant_role_wish_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM conference_role WHERE id = NEW.a),
		(SELECT x.conference_id FROM single_participant c JOIN conference_participant x ON x.id = c.conference_participant_id WHERE c.id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "single_participant_role_wish_same_conference" AFTER INSERT OR UPDATE ON "single_participant_role_wish"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "single_participant_role_wish_same_conference"();--> statement-breakpoint
CREATE FUNCTION "committee_to_role_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM committee WHERE id = NEW.a),
		(SELECT conference_id FROM conference_role WHERE id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "committee_to_role_same_conference" AFTER INSERT OR UPDATE ON "committee_to_role"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "committee_to_role_same_conference"();--> statement-breakpoint
CREATE FUNCTION "delegation_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		NEW.conference_id,
		(SELECT conference_id FROM conference_role WHERE id = NEW.assigned_role_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "delegation_same_conference" AFTER INSERT OR UPDATE ON "delegation"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "delegation_same_conference"();--> statement-breakpoint
CREATE FUNCTION "resolution_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		NEW.conference_id,
		(SELECT conference_id FROM committee WHERE id = NEW.committee_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "resolution_same_conference" AFTER INSERT OR UPDATE ON "resolution"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "resolution_same_conference"();--> statement-breakpoint
CREATE FUNCTION "calendar_entry_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM calendar_day WHERE id = NEW.calendar_day_id),
		(SELECT conference_id FROM place WHERE id = NEW.place_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "calendar_entry_same_conference" AFTER INSERT OR UPDATE ON "calendar_entry"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "calendar_entry_same_conference"();--> statement-breakpoint
CREATE FUNCTION "calendar_entry_to_calendar_track_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT x.conference_id FROM calendar_entry c JOIN calendar_day x ON x.id = c.calendar_day_id WHERE c.id = NEW.a),
		(SELECT x.conference_id FROM calendar_track c JOIN calendar_day x ON x.id = c.calendar_day_id WHERE c.id = NEW.b)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "calendar_entry_to_calendar_track_same_conference" AFTER INSERT OR UPDATE ON "calendar_entry_to_calendar_track"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "calendar_entry_to_calendar_track_same_conference"();--> statement-breakpoint
CREATE FUNCTION "assignment_review_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		NEW.conference_id,
		(SELECT conference_id FROM delegation WHERE id = NEW.delegation_id),
		(SELECT x.conference_id FROM single_participant c JOIN conference_participant x ON x.id = c.conference_participant_id WHERE c.id = NEW.single_participant_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "assignment_review_same_conference" AFTER INSERT OR UPDATE ON "assignment_review"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "assignment_review_same_conference"();--> statement-breakpoint
CREATE FUNCTION "assignment_unit_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		NEW.conference_id,
		(SELECT conference_id FROM delegation WHERE id = NEW.source_delegation_id),
		(SELECT x.conference_id FROM single_participant c JOIN conference_participant x ON x.id = c.conference_participant_id WHERE c.id = NEW.source_single_participant_id),
		(SELECT conference_id FROM conference_role WHERE id = NEW.role_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "assignment_unit_same_conference" AFTER INSERT OR UPDATE ON "assignment_unit"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "assignment_unit_same_conference"();--> statement-breakpoint
CREATE FUNCTION "assignment_unit_member_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT conference_id FROM assignment_unit WHERE id = NEW.unit_id),
		(SELECT x.conference_id FROM delegation_member c JOIN delegation x ON x.id = c.delegation_id WHERE c.id = NEW.delegation_member_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "assignment_unit_member_same_conference" AFTER INSERT OR UPDATE ON "assignment_unit_member"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "assignment_unit_member_same_conference"();--> statement-breakpoint
CREATE FUNCTION "assignment_single_role_same_conference"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	PERFORM assert_same_conference(TG_TABLE_NAME, ARRAY[
		(SELECT x.conference_id FROM single_participant c JOIN conference_participant x ON x.id = c.conference_participant_id WHERE c.id = NEW.single_participant_id),
		(SELECT conference_id FROM conference_role WHERE id = NEW.role_id)
	]);
	RETURN NULL;
END $$;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "assignment_single_role_same_conference" AFTER INSERT OR UPDATE ON "assignment_single_role"
	DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "assignment_single_role_same_conference"();--> statement-breakpoint

-- A row's conference is fixed: rewriting the same value passes, changing it does not.
CREATE FUNCTION conference_id_is_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	IF NEW.conference_id IS DISTINCT FROM OLD.conference_id THEN
		RAISE EXCEPTION 'the conference of a % row cannot change', TG_TABLE_NAME
			USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_conference_id_immutable';
	END IF;
	RETURN NEW;
END $$;--> statement-breakpoint
CREATE TRIGGER "assignment_review_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "assignment_review"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "assignment_unit_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "assignment_unit"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "assignment_weights_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "assignment_weights"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "attendance_session_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "attendance_session"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "calendar_day_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "calendar_day"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "committee_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "committee"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "conference_participant_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "conference_participant"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "conference_role_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "conference_role"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "delegation_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "delegation"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "place_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "place"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "resolution_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "resolution"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "school_suggestion_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "school_suggestion"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "search_history_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "search_history"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "stored_file_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "stored_file"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "survey_question_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "survey_question"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "team_member_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "team_member"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "team_member_invitation_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "team_member_invitation"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint
CREATE TRIGGER "waiting_list_entry_conference_id_immutable" BEFORE UPDATE OF "conference_id" ON "waiting_list_entry"
	FOR EACH ROW EXECUTE FUNCTION conference_id_is_immutable();--> statement-breakpoint

-- ---- The statistics views, reading conference and person through the participant row ----
CREATE VIEW "statistics_participation" AS
WITH supervised AS (
	SELECT
		s.a AS supervisor_id,
		coalesce(d.applied, sp.applied) AS applied,
		coalesce(d.assigned_role_id, sp.assigned_role_id) IS NOT NULL AS has_role
	FROM supervision s
	LEFT JOIN delegation_member dm ON dm.conference_participant_id = s.b
	LEFT JOIN delegation d ON d.id = dm.delegation_id
	LEFT JOIN single_participant sp ON sp.conference_participant_id = s.b
	-- a supervised person who holds no registration (any more) counts for nothing
	WHERE dm.id IS NOT NULL OR sp.id IS NOT NULL
)
SELECT
	p.conference_id,
	'DELEGATION_MEMBER' AS kind,
	p.user_id,
	dm.created_at,
	d.applied,
	d.assigned_role_id IS NOT NULL AS has_role,
	coalesce(r.kind = 'NATION', false) AS has_nation,
	coalesce(r.kind = 'NON_STATE_ACTOR', false) AS has_non_state_actor,
	dm.assigned_committee_id,
	NULL::text AS assigned_role_id,
	false AS accepted,
	true AS attends
FROM delegation_member dm
JOIN conference_participant p ON p.id = dm.conference_participant_id
JOIN delegation d ON d.id = dm.delegation_id
LEFT JOIN conference_role r ON r.id = d.assigned_role_id
UNION ALL
SELECT
	p.conference_id,
	'SINGLE_PARTICIPANT',
	p.user_id,
	sp.created_at,
	sp.applied,
	sp.assigned_role_id IS NOT NULL,
	false,
	false,
	NULL,
	sp.assigned_role_id,
	false,
	true
FROM single_participant sp
JOIN conference_participant p ON p.id = sp.conference_participant_id
UNION ALL
SELECT
	p.conference_id,
	'SUPERVISOR',
	p.user_id,
	cs.created_at,
	coalesce(bool_or(s.applied), false),
	coalesce(bool_or(s.applied AND s.has_role), false),
	false,
	false,
	NULL,
	NULL,
	coalesce(bool_or(s.has_role), false),
	cs.plans_own_attendence_at_conference
FROM conference_supervisor cs
JOIN conference_participant p ON p.id = cs.conference_participant_id
LEFT JOIN supervised s ON s.supervisor_id = cs.id
GROUP BY cs.id, p.conference_id, p.user_id
UNION ALL
SELECT
	tm.conference_id,
	'TEAM_MEMBER',
	tm.user_id,
	tm.created_at,
	false,
	false,
	false,
	false,
	NULL,
	NULL,
	false,
	true
FROM team_member tm;--> statement-breakpoint--> statement-breakpoint
CREATE MATERIALIZED VIEW "statistics_people" AS
SELECT
	p.conference_id,
	p.kind,
	p.applied,
	p.has_role,
	p.has_nation,
	p.assigned_committee_id IS NOT NULL AS has_committee,
	p.accepted,
	p.attends,
	u.gender,
	u.food_preference,
	count(*)::int AS count
FROM statistics_participation p
JOIN "user" u ON u.id = p.user_id
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_people_key" ON "statistics_people" (
	"conference_id", "kind", "applied", "has_role", "has_nation", "has_committee", "accepted",
	"attends", "gender", "food_preference"
) NULLS NOT DISTINCT;--> statement-breakpoint
CREATE MATERIALIZED VIEW "statistics_registration_days" AS
WITH registrations AS (
	SELECT
		d.conference_id,
		'DELEGATION' AS kind,
		d.created_at,
		d.applied,
		d.assigned_role_id IS NOT NULL AS has_role,
		(SELECT count(*) FROM delegation_member dm WHERE dm.delegation_id = d.id) AS members
	FROM delegation d
	UNION ALL
	SELECT conference_id, kind, created_at, applied, has_role, 0
	FROM statistics_participation
	WHERE kind IN ('SINGLE_PARTICIPANT', 'SUPERVISOR')
)
SELECT
	conference_id,
	created_at::date AS day,
	kind,
	applied,
	has_role,
	count(*)::int AS registrations,
	sum(members)::int AS members
FROM registrations
GROUP BY 1, 2, 3, 4, 5
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_registration_days_key" ON "statistics_registration_days" (
	"conference_id", "day", "kind", "applied", "has_role"
);--> statement-breakpoint
CREATE MATERIALIZED VIEW "statistics_ages" AS
WITH categorized AS (
	SELECT
		p.conference_id,
		p.user_id,
		p.applied,
		p.has_role,
		CASE
			WHEN p.kind = 'SINGLE_PARTICIPANT' AND p.assigned_role_id IS NOT NULL
				THEN 'role_' || p.assigned_role_id
			WHEN p.kind = 'SINGLE_PARTICIPANT' THEN 'unassigned'
			WHEN p.has_nation THEN 'nationDelegates'
			WHEN p.has_non_state_actor THEN 'nsaParticipants'
			ELSE 'unassignedDelegationMembers'
		END AS category_id,
		CASE WHEN p.kind = 'SINGLE_PARTICIPANT' THEN 'singleParticipant' ELSE 'delegationMember' END
			AS category_type,
		r.name AS role_name,
		CASE WHEN p.has_nation THEN p.assigned_committee_id END AS committee_id
	FROM statistics_participation p
	LEFT JOIN conference_role r ON r.id = p.assigned_role_id
	WHERE p.kind IN ('DELEGATION_MEMBER', 'SINGLE_PARTICIPANT')
)
SELECT
	c.conference_id,
	c.category_id,
	c.category_type,
	c.role_name,
	c.committee_id,
	co.name AS committee_name,
	co.abbreviation AS committee_abbreviation,
	c.applied,
	c.has_role,
	date_part('year', age(conf.end_conference::date, u.birthday::date))::int AS age,
	count(*)::int AS count
FROM categorized c
JOIN conference conf ON conf.id = c.conference_id
JOIN "user" u ON u.id = c.user_id
LEFT JOIN committee co ON co.id = c.committee_id
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_ages_key" ON "statistics_ages" (
	"conference_id", "category_id", "committee_id", "applied", "has_role", "age"
) NULLS NOT DISTINCT;--> statement-breakpoint
CREATE MATERIALIZED VIEW "statistics_addresses" AS
SELECT
	p.conference_id,
	p.applied,
	p.has_role,
	u.country,
	left(u.zip, 3) AS zip_prefix,
	count(*)::int AS count
FROM statistics_participation p
JOIN "user" u ON u.id = p.user_id
WHERE p.kind IN ('DELEGATION_MEMBER', 'SINGLE_PARTICIPANT')
GROUP BY 1, 2, 3, 4, 5
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_addresses_key" ON "statistics_addresses" (
	"conference_id", "applied", "has_role", "country", "zip_prefix"
) NULLS NOT DISTINCT;--> statement-breakpoint
CREATE MATERIALIZED VIEW "statistics_participant_status" AS
WITH expected AS (
	SELECT DISTINCT conference_id, user_id
	FROM statistics_participation
	WHERE (kind IN ('DELEGATION_MEMBER', 'SINGLE_PARTICIPANT') AND has_role)
		OR (kind = 'SUPERVISOR' AND attends)
),
statuses AS (
	SELECT
		coalesce(s.conference_id, e.conference_id) AS conference_id,
		coalesce(s.user_id, e.user_id) AS user_id,
		e.user_id IS NOT NULL AS expected,
		s.id IS NOT NULL AS has_status,
		s.payment_status,
		s.terms_and_conditions,
		s.guardian_consent,
		s.media_consent,
		coalesce(s.did_attend, false) AS did_attend
	FROM conference_participant s
	FULL JOIN expected e ON e.conference_id = s.conference_id AND e.user_id = s.user_id
),
judged AS (
	SELECT
		st.*,
		coalesce(
			date_part('year', age(conf.start_conference::date, u.birthday::date)) >= 18,
			false
		) AS of_age
	FROM statuses st
	JOIN conference conf ON conf.id = st.conference_id
	JOIN "user" u ON u.id = st.user_id
)
SELECT
	conference_id,
	expected,
	has_status,
	payment_status,
	coalesce(
		terms_and_conditions = 'DONE' AND (of_age OR guardian_consent = 'DONE')
			AND media_consent = 'DONE',
		false
	) AS postal_done,
	coalesce(
		terms_and_conditions = 'PROBLEM' OR (NOT of_age AND guardian_consent = 'PROBLEM')
			OR media_consent = 'PROBLEM',
		false
	) AS postal_problem,
	did_attend,
	count(*)::int AS count
FROM judged
GROUP BY 1, 2, 3, 4, 5, 6, 7
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_participant_status_key" ON "statistics_participant_status" (
	"conference_id", "expected", "has_status", "payment_status", "postal_done", "postal_problem",
	"did_attend"
) NULLS NOT DISTINCT;--> statement-breakpoint

CREATE MATERIALIZED VIEW "statistics_papers" AS
SELECT
	d.conference_id,
	p.type,
	p.status,
	EXISTS (
		SELECT 1
		FROM paper_version v
		JOIN paper_review r ON r.paper_version_id = v.id
		WHERE v.paper_id = p.id
	) AS has_review,
	co.id AS committee_id,
	co.name AS committee_name,
	co.abbreviation AS committee_abbreviation,
	count(*)::int AS count
FROM paper p
JOIN delegation d ON d.id = p.delegation_id
LEFT JOIN committee_agenda_item ai ON ai.id = p.agenda_item_id
LEFT JOIN committee co ON co.id = ai.committee_id
GROUP BY 1, 2, 3, 4, 5, 6, 7
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_papers_key" ON "statistics_papers" (
	"conference_id", "type", "status", "has_review", "committee_id"
) NULLS NOT DISTINCT;
