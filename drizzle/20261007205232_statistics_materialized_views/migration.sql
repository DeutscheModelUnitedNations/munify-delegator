-- Custom SQL migration file, put your code below! --

-- Statistics dashboard. Every block of `getConferenceStatistics` reads one of the materialized
-- views below, which the app refreshes periodically (`src/api/handlers/statistics.ts`), so the
-- page costs a few index lookups instead of a pass over every registration.
--
-- The dashboard filters by registration state, so each view keeps two dimensions to filter on:
-- `applied` and `has_role`. The five filters (`matchesStatsFilter` in
-- `src/api/services/statisticsFilters.ts`) then pick and sum the matching rows at read time.

-- One row per participation in a conference: delegation member, single participant, supervisor
-- or team member. A plain view the materialized ones below aggregate over, never read directly.
--   applied, has_role  the filter dimensions. A delegation member takes them from its
--                      delegation (a nation or a non-state actor counts as a role); a supervisor
--                      from the people they supervise: applied when any of them applied, with a
--                      role when any applied one got one.
--   accepted           supervisors only: any supervised participant has a role, applied or not.
--   attends            supervisors only: plans to attend themselves. True for everyone else.
CREATE VIEW "statistics_participation" AS
WITH supervised AS (
	SELECT
		j.a AS supervisor_id,
		d.applied,
		(d.assigned_nation_alpha3_code IS NOT NULL OR d.assigned_non_state_actor_id IS NOT NULL)
			AS has_role
	FROM conference_supervisor_to_delegation_member j
	JOIN delegation_member dm ON dm.id = j.b
	JOIN delegation d ON d.id = dm.delegation_id
	UNION ALL
	SELECT j.a, sp.applied, sp.assigned_role_id IS NOT NULL
	FROM conference_supervisor_to_single_participant j
	JOIN single_participant sp ON sp.id = j.b
)
SELECT
	dm.conference_id,
	'DELEGATION_MEMBER' AS kind,
	dm.user_id,
	dm.created_at,
	d.applied,
	(d.assigned_nation_alpha3_code IS NOT NULL OR d.assigned_non_state_actor_id IS NOT NULL)
		AS has_role,
	d.assigned_nation_alpha3_code IS NOT NULL AS has_nation,
	d.assigned_non_state_actor_id IS NOT NULL AS has_non_state_actor,
	dm.assigned_committee_id,
	NULL::text AS assigned_role_id,
	false AS accepted,
	true AS attends
FROM delegation_member dm
JOIN delegation d ON d.id = dm.delegation_id
UNION ALL
SELECT
	sp.conference_id,
	'SINGLE_PARTICIPANT',
	sp.user_id,
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
UNION ALL
SELECT
	cs.conference_id,
	'SUPERVISOR',
	cs.user_id,
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
LEFT JOIN supervised s ON s.supervisor_id = cs.id
GROUP BY cs.id
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
FROM team_member tm;

-- Head counts of every kind of participation, by everything the dashboard splits people by:
-- registration totals, the role and committee split, supervisors, diet and gender.
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
WITH DATA;

CREATE UNIQUE INDEX "statistics_people_key" ON "statistics_people" (
	"conference_id", "kind", "applied", "has_role", "has_nation", "has_committee", "accepted",
	"attends", "gender", "food_preference"
) NULLS NOT DISTINCT;

-- Delegations by school, with their member counts.
CREATE MATERIALIZED VIEW "statistics_delegations" AS
SELECT
	d.conference_id,
	d.applied,
	(d.assigned_nation_alpha3_code IS NOT NULL OR d.assigned_non_state_actor_id IS NOT NULL)
		AS has_role,
	d.school,
	count(*)::int AS delegations,
	coalesce(sum(
		(SELECT count(*) FROM delegation_member dm WHERE dm.delegation_id = d.id)
	), 0)::int AS members
FROM delegation d
GROUP BY 1, 2, 3, 4
WITH DATA;

CREATE UNIQUE INDEX "statistics_delegations_key" ON "statistics_delegations" (
	"conference_id", "applied", "has_role", "school"
) NULLS NOT DISTINCT;

-- Registrations per day, for the cumulative timeline. A delegation's members count on the day
-- the delegation was created.
CREATE MATERIALIZED VIEW "statistics_registration_days" AS
WITH registrations AS (
	SELECT
		d.conference_id,
		'DELEGATION' AS kind,
		d.created_at,
		d.applied,
		(d.assigned_nation_alpha3_code IS NOT NULL OR d.assigned_non_state_actor_id IS NOT NULL)
			AS has_role,
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
WITH DATA;

CREATE UNIQUE INDEX "statistics_registration_days_key" ON "statistics_registration_days" (
	"conference_id", "day", "kind", "applied", "has_role"
);

-- Applications per custom role (the roles a single participant applied for, not the one they
-- were assigned). Roles nobody applied for keep a row with zeros.
CREATE MATERIALIZED VIEW "statistics_role_applications" AS
SELECT
	r.conference_id,
	r.id AS role_id,
	r.name,
	r.font_awesome_icon,
	count(sp.id)::int AS total,
	(count(sp.id) FILTER (WHERE sp.applied))::int AS applied
FROM custom_conference_role r
LEFT JOIN custom_conference_role_to_single_participant j ON j.a = r.id
LEFT JOIN single_participant sp ON sp.id = j.b
GROUP BY r.id
WITH DATA;

CREATE UNIQUE INDEX "statistics_role_applications_key"
	ON "statistics_role_applications" ("role_id");

-- Participants by age at the end of the conference, in the categories the age chart shows:
-- nation delegates (with their committee), non-state actor delegates, delegation members
-- without an assignment, single participants per assigned role and those without one.
-- `age` is null for people without a birthday.
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
	LEFT JOIN custom_conference_role r ON r.id = p.assigned_role_id
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
WITH DATA;

CREATE UNIQUE INDEX "statistics_ages_key" ON "statistics_ages" (
	"conference_id", "category_id", "committee_id", "applied", "has_role", "age"
) NULLS NOT DISTINCT;

-- Delegation members and single participants by country and postal code, for the maps.
CREATE MATERIALIZED VIEW "statistics_addresses" AS
SELECT
	p.conference_id,
	p.applied,
	p.has_role,
	u.country,
	u.zip,
	count(*)::int AS count
FROM statistics_participation p
JOIN "user" u ON u.id = p.user_id
WHERE p.kind IN ('DELEGATION_MEMBER', 'SINGLE_PARTICIPANT')
GROUP BY 1, 2, 3, 4, 5
WITH DATA;

CREATE UNIQUE INDEX "statistics_addresses_key" ON "statistics_addresses" (
	"conference_id", "applied", "has_role", "country", "zip"
) NULLS NOT DISTINCT;

-- Postal and payment state. `expected` marks the people who are expected to complete both:
-- delegation members and single participants with a role, and supervisors who attend. They are
-- counted even without a status row (`has_status` false), and status rows of everyone else are
-- counted too. Guardian consent only matters for whoever is a minor when the conference starts.
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
	FROM conference_participant_status s
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
WITH DATA;

CREATE UNIQUE INDEX "statistics_participant_status_key" ON "statistics_participant_status" (
	"conference_id", "expected", "has_status", "payment_status", "postal_done", "postal_problem",
	"did_attend"
) NULLS NOT DISTINCT;

-- Seats per committee and how many of them members of applied delegations hold.
CREATE MATERIALIZED VIEW "statistics_committee_fill" AS
SELECT
	c.conference_id,
	c.id AS committee_id,
	c.name,
	c.abbreviation,
	((SELECT count(*) FROM committee_to_nation cn WHERE cn.a = c.id)
		* c.num_of_seats_per_delegation)::int AS total_seats,
	(
		SELECT count(*)
		FROM delegation_member dm
		JOIN delegation d ON d.id = dm.delegation_id
		WHERE dm.assigned_committee_id = c.id AND d.applied
	)::int AS assigned_seats
FROM committee c
WITH DATA;

CREATE UNIQUE INDEX "statistics_committee_fill_key" ON "statistics_committee_fill" ("committee_id");

CREATE MATERIALIZED VIEW "statistics_waiting_list" AS
SELECT conference_id, hidden, assigned, count(*)::int AS count
FROM waiting_list_entry
GROUP BY 1, 2, 3
WITH DATA;

CREATE UNIQUE INDEX "statistics_waiting_list_key"
	ON "statistics_waiting_list" ("conference_id", "hidden", "assigned");

-- Papers by type, status, whether any version was reviewed, and the committee of their agenda
-- item (null without one).
CREATE MATERIALIZED VIEW "statistics_papers" AS
SELECT
	p.conference_id,
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
LEFT JOIN committee_agenda_item ai ON ai.id = p.agenda_item_id
LEFT JOIN committee co ON co.id = ai.committee_id
GROUP BY 1, 2, 3, 4, 5, 6, 7
WITH DATA;

CREATE UNIQUE INDEX "statistics_papers_key" ON "statistics_papers" (
	"conference_id", "type", "status", "has_review", "committee_id"
) NULLS NOT DISTINCT;

-- When the views above were last refreshed; refreshed after them, so the dashboard can say how
-- current its figures are.
CREATE MATERIALIZED VIEW "statistics_refreshed_at" AS
SELECT 1 AS id, now() AS refreshed_at
WITH DATA;

CREATE UNIQUE INDEX "statistics_refreshed_at_key" ON "statistics_refreshed_at" ("id");
