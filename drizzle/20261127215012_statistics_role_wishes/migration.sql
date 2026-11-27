-- The delegations' role wishes, for the statistics page's 3D wish chart: per role and wish rank,
-- how many delegations named it there, grouped by the filter dimensions and by whether the
-- delegation got that very role. `rank` is the wish's place in its delegation's list (1 = first
-- wish), counted afresh so gaps in the stored ranks do not show. Refreshed with the other
-- statistics views (`STATISTICS_VIEWS`).
CREATE MATERIALIZED VIEW "statistics_role_wishes" AS
WITH ranked AS (
	SELECT
		ra.role_id,
		ra.delegation_id,
		row_number() OVER (PARTITION BY ra.delegation_id ORDER BY ra.rank)::int AS rank
	FROM role_application ra
)
SELECT
	d.conference_id,
	r.id AS role_id,
	r.kind,
	r.nation_alpha3_code,
	r.name,
	w.rank,
	d.applied,
	d.assigned_role_id IS NOT NULL AS has_role,
	d.assigned_role_id IS NOT DISTINCT FROM r.id AS granted,
	count(*)::int AS count
FROM ranked w
JOIN delegation d ON d.id = w.delegation_id
JOIN conference_role r ON r.id = w.role_id
GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
WITH DATA;--> statement-breakpoint
CREATE UNIQUE INDEX "statistics_role_wishes_key"
	ON "statistics_role_wishes" ("role_id", "rank", "applied", "has_role", "granted");--> statement-breakpoint
CREATE INDEX "statistics_role_wishes_conference_id_idx"
	ON "statistics_role_wishes" ("conference_id");
