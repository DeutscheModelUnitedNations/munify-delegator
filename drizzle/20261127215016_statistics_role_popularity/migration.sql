-- Custom SQL migration file, put your code below! --
-- The delegations' wishes for nations and non-state actors, for the statistics page's role
-- popularity: per role, per rank and per filter dimension (the delegation applied, the
-- delegation has a role) how many delegations named the role. Roles nobody wished for have no
-- row; the resolver lists them from `conference_role` with 0. A rank below 1 exists only inside a
-- transaction swapping two ranks (`normalizeRoleApplicationRanks`) and is never committed.
CREATE MATERIALIZED VIEW "statistics_role_popularity" AS
SELECT
	d.conference_id,
	ra.role_id,
	ra.rank,
	d.applied,
	d.assigned_role_id IS NOT NULL AS has_role,
	count(*)::int AS count
FROM role_application ra
JOIN delegation d ON d.id = ra.delegation_id
GROUP BY 1, 2, 3, 4, 5
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_role_popularity_key" ON "statistics_role_popularity" (
	"role_id", "rank", "applied", "has_role"
);--> statement-breakpoint
CREATE INDEX "statistics_role_popularity_conference_id_idx"
	ON "statistics_role_popularity" ("conference_id");
