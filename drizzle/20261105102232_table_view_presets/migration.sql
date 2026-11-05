-- The shared views every installation starts with (`#lib/dataGrid/tables/presetViews.ts`, which
-- the dev seed inserts again and whose test keeps this file in step): global, so every team finds
-- them in the participants table's views menu. They replace the table's "waiting list" and "open
-- issues" buttons.
INSERT INTO "table_view" ("id", "table_key", "name", "state", "shared") VALUES
	('preset-participants-waiting-list', 'participants', 'Warteliste', '{"v":1,"visibility":{"waitingListSince":true},"order":[],"sizes":{},"sorting":[{"id":"waitingListSince","desc":false}],"filter":{"type":"group","op":"and","items":[{"type":"condition","column":"onWaitingList","operator":"isTrue"}]},"grouping":[],"groups":{"collapsed":false,"toggled":[]},"pageSize":20}'::jsonb, true),
	('preset-participants-open-issues', 'participants', 'Offene Probleme', '{"v":1,"visibility":{},"order":[],"sizes":{},"sorting":[{"id":"family_name","desc":false}],"filter":{"type":"group","op":"and","items":[{"type":"condition","column":"accepted","operator":"isTrue"},{"type":"condition","column":"hasOpenIssue","operator":"isTrue"}]},"grouping":[],"groups":{"collapsed":false,"toggled":[]},"pageSize":20}'::jsonb, true)
ON CONFLICT ("id") DO NOTHING;
