-- Custom SQL migration file, put your code below! --
-- `statistics_ages` and `statistics_participant_status` exactly as
-- `statistics_materialized_views` created them, dropped by `birthday_calendar_day` so
-- `user.birthday` could become a date.
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
--> statement-breakpoint

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
