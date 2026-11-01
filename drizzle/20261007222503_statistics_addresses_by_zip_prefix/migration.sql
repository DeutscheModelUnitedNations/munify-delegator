-- Custom SQL migration file, put your code below! --

-- The address statistics only ever need a region, never a single ZIP: the nationality chart sums
-- by country and the map draws one marker per ZIP area. Grouping by the first three digits keeps
-- the view at a few hundred rows per conference instead of one per distinct ZIP.
DROP MATERIALIZED VIEW "statistics_addresses";

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
WITH DATA;

CREATE UNIQUE INDEX "statistics_addresses_key" ON "statistics_addresses" (
	"conference_id", "applied", "has_role", "country", "zip_prefix"
) NULLS NOT DISTINCT;
