-- Custom SQL migration file, put your code below! --
-- `delegation.member_count` follows `delegation_member`: every insert, delete and move of a member
-- (`delegation_id` changing, which applying an assignment does) adjusts the counts of the
-- delegations involved. Kept here rather than in the app because members are written from many
-- places; the assignment board filters its pool by this count.
CREATE OR REPLACE FUNCTION "delegation_member_count_sync"() RETURNS trigger AS $$
BEGIN
	IF TG_OP IN ('DELETE', 'UPDATE') THEN
		UPDATE "delegation" SET "member_count" = "member_count" - 1 WHERE "id" = OLD."delegation_id";
	END IF;
	IF TG_OP IN ('INSERT', 'UPDATE') THEN
		UPDATE "delegation" SET "member_count" = "member_count" + 1 WHERE "id" = NEW."delegation_id";
	END IF;
	RETURN NULL;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "delegation_member_count_insert_delete"
	AFTER INSERT OR DELETE ON "delegation_member"
	FOR EACH ROW EXECUTE FUNCTION "delegation_member_count_sync"();
--> statement-breakpoint
CREATE TRIGGER "delegation_member_count_move"
	AFTER UPDATE OF "delegation_id" ON "delegation_member"
	FOR EACH ROW WHEN (OLD."delegation_id" IS DISTINCT FROM NEW."delegation_id")
	EXECUTE FUNCTION "delegation_member_count_sync"();
--> statement-breakpoint
UPDATE "delegation" d SET "member_count" = (
	SELECT count(*) FROM "delegation_member" m WHERE m."delegation_id" = d."id"
);
