import { sql, type SQL } from 'drizzle-orm';
import type { ColumnMeta } from '#lib/dataGrid/columnTypes';
import { PARTICIPANTS_COLUMNS } from '#lib/dataGrid/tables/participants';
import { col, wordsIn, type DataTableSource, type SourceArgs } from '../source';
import { participationCountJoin } from './participationCount';

/**
 * The participants table: everyone with a part in the conference - delegation members, single
 * participants, supervisors, the team, and the people waiting without any registration - one row
 * per person, with the state of their paperwork. A row's id is the user id.
 */

/**
 * Every registration of the conference as one row: the person, how they take part, their own
 * school, whether seated. Delegates, singles and supervisors name their conference and person
 * through their `conference_participant` (`p`); a supervisor is seated once someone they supervise
 * is. People still waiting on the waiting list without any registration are rows too
 * (`WAITING_LIST`).
 */
function registrations(conferenceId: string) {
	const seated = sql`(d.assigned_role_id is not null)`;
	const schoolOf = (id: SQL) => sql`(select sc.name from school sc where sc.id = ${id})`;
	// a nation role has no name of its own, so `dr.name` is the non-state actor's
	return sql`
		select p.user_id, 'DELEGATION_MEMBER' as role, dr.nation_alpha3_code as nation_code,
			dr.name as nsa_name, com.name as committee, ${schoolOf(sql`p.school_id`)} as school,
			dm.is_head_delegate as is_head_delegate, null::text as assigned_role_name,
			null::text as team_role, null::boolean as plans_own_attendance, ${seated} as accepted
		from delegation_member dm
		join conference_participant p on p.id = dm.conference_participant_id
		join delegation d on d.id = dm.delegation_id
		left join conference_role dr on dr.id = d.assigned_role_id
		left join committee com on com.id = dm.assigned_committee_id
		where p.conference_id = ${conferenceId}
		union all
		select p.user_id, 'SUPERVISOR', null, null, null, ${schoolOf(sql`p.school_id`)}, null, null,
			null, cs.plans_own_attendence_at_conference,
			(exists (
				select 1 from supervision j
				join delegation_member dm2 on dm2.conference_participant_id = j.b
				join delegation d on d.id = dm2.delegation_id
				where j.a = cs.id and ${seated}
			) or exists (
				select 1 from supervision j
				join single_participant sp2 on sp2.conference_participant_id = j.b
				where j.a = cs.id and sp2.assigned_role_id is not null
			))
		from conference_supervisor cs
		join conference_participant p on p.id = cs.conference_participant_id
		where p.conference_id = ${conferenceId}
		union all
		select p.user_id, 'SINGLE_PARTICIPANT', null, null, null, ${schoolOf(sql`p.school_id`)}, null,
			role.name, null, null, sp.assigned_role_id is not null
		from single_participant sp
		join conference_participant p on p.id = sp.conference_participant_id
		left join conference_role role on role.id = sp.assigned_role_id
		where p.conference_id = ${conferenceId}
		union all
		select tm.user_id, 'TEAM_MEMBER', null, null, null, null, null, null, tm.role::text, null, true
		from team_member tm
		where tm.conference_id = ${conferenceId}
		union all
		select w.user_id, 'WAITING_LIST', null, null, null, ${schoolOf(sql`w.school_id`)}, null, null,
			null, null, false
		from waiting_list_entry w
		where w.conference_id = ${conferenceId} and w.assigned_at is null
			and not exists (
				select 1 from conference_participant p
				where p.user_id = w.user_id and p.conference_id = w.conference_id and (
					exists (select 1 from delegation_member dm where dm.conference_participant_id = p.id)
					or exists (select 1 from single_participant sp where sp.conference_participant_id = p.id)
					or exists (select 1 from conference_supervisor cs where cs.conference_participant_id = p.id)
				)
			)
	`;
}

/** The paperwork as the table has always summed it up: a problem anywhere, else done or pending. */
const postalStatus = sql`(case
	when s.id is null then 'PENDING'
	when s.terms_and_conditions = 'PROBLEM' or s.media_consent = 'PROBLEM' or s.guardian_consent = 'PROBLEM' then 'PROBLEM'
	when s.terms_and_conditions = 'DONE' and s.media_consent = 'DONE'
		and (s.guardian_consent = 'DONE' or coalesce(date_part('year', age(c.start_conference, u.birthday)), 0) >= 18) then 'DONE'
	else 'PENDING' end)`;

const paymentStatus = sql`coalesce(s.payment_status::text, 'PENDING')`;

/** A birthday (rolling Feb 29 over to March 1, like a JS date) within the days of the conference. */
const birthdayDuringConference = sql`(u.birthday is not null and exists (
	select 1 from generate_series(
		extract(year from c.start_conference)::int,
		extract(year from c.end_conference)::int
	) as y
	where make_date(y, extract(month from u.birthday)::int, 1) + (extract(day from u.birthday)::int - 1)
		between c.start_conference::date and c.end_conference::date
))`;

/**
 * Each column's value. `teammatePrivate` marks the profile fields a team member may not read of a
 * teammate (only team admins do): blank on the team's rows for a caller who may not.
 */
const VALUES: Record<string, { expr: SQL; teammatePrivate?: true }> = {
	userId: { expr: sql`reg.user_id` },
	family_name: { expr: sql`u.family_name` },
	given_name: { expr: sql`u.given_name` },
	email: { expr: sql`u.email` },
	phone: { expr: sql`u.phone` },
	birthday: { expr: sql`u.birthday::date` },
	pronouns: { expr: sql`u.pronouns` },
	city: { expr: sql`u.city`, teammatePrivate: true },
	country: { expr: sql`u.country`, teammatePrivate: true },
	gender: { expr: sql`u.gender::text`, teammatePrivate: true },
	foodPreference: { expr: sql`u.food_preference::text`, teammatePrivate: true },
	ageAtConference: { expr: sql`date_part('year', age(c.start_conference, u.birthday))::int` },
	hasBirthdayDuringConference: { expr: birthdayDuringConference },
	role: { expr: sql`reg.role` },
	nation: { expr: sql`coalesce(reg.nsa_name, reg.nation_code)` },
	committee: { expr: sql`reg.committee` },
	school: { expr: sql`reg.school` },
	isHeadDelegate: { expr: sql`reg.is_head_delegate` },
	assignedRoleName: { expr: sql`reg.assigned_role_name` },
	teamRole: { expr: sql`reg.team_role` },
	plansOwnAttendance: { expr: sql`reg.plans_own_attendance` },
	paymentStatus: { expr: paymentStatus },
	termsAndConditions: { expr: sql`coalesce(s.terms_and_conditions::text, 'PENDING')` },
	guardianConsent: { expr: sql`coalesce(s.guardian_consent::text, 'PENDING')` },
	mediaConsent: { expr: sql`coalesce(s.media_consent::text, 'PENDING')` },
	postalRegistrationStatus: { expr: postalStatus },
	didAttend: { expr: sql`s.did_attend` },
	documentNumber: { expr: sql`s.assigend_document_number::text` },
	accessCardId: { expr: sql`s.access_card_id` },
	accepted: { expr: sql`reg.accepted` },
	waitingListSince: { expr: sql`wl.created_at` },
	seatedFromWaitingListAt: { expr: sql`wl.assigned_at` },
	onWaitingList: { expr: sql`(wl.id is not null and wl.assigned_at is null)` },
	hasOpenIssue: {
		expr: sql`(reg.accepted and reg.role <> 'TEAM_MEMBER' and (${paymentStatus} <> 'DONE' or ${postalStatus} <> 'DONE'))`
	},
	// seats actually held in any conference: joined only when asked for (see `rows`)
	participationCount: { expr: sql`coalesce(pc.n, 0)::int` }
};

function valueOf({ id, args }: { id: string; args: SourceArgs }): SQL {
	const value = Object.hasOwn(VALUES, id) ? VALUES[id] : undefined;
	if (!value) return sql`null`;
	return value.teammatePrivate && !args.access.teamDetails
		? sql`(case when reg.role = 'TEAM_MEMBER' then null else ${value.expr} end)`
		: value.expr;
}

function rows(args: SourceArgs) {
	const columns = PARTICIPANTS_COLUMNS.filter(
		(column) => column.id !== 'participationCount' || args.uses.has('participationCount')
	);
	const values = columns.map(
		(column: ColumnMeta) => sql`${valueOf({ id: column.id, args })} as ${sql.identifier(column.id)}`
	);
	return sql`
		select reg.user_id as id, ${sql.join(values, sql`, `)}
		from (${registrations(args.conferenceId)}) as reg
		join "user" u on u.id = reg.user_id
		${args.uses.has('participationCount') ? participationCountJoin(sql`reg.user_id`) : sql``}
		join conference c on c.id = ${args.conferenceId}
		left join conference_participant s
			on s.user_id = reg.user_id and s.conference_id = ${args.conferenceId}
		left join waiting_list_entry wl
			on wl.user_id = reg.user_id and wl.conference_id = ${args.conferenceId}
	`;
}

export const participantsSource: DataTableSource = {
	key: 'participants',
	columns: PARTICIPANTS_COLUMNS,
	rows,
	// the name as written (given name first) or the email
	search: (term) => wordsIn({ term, exprs: [col('given_name'), col('family_name'), col('email')] }),
	tieBreak: [{ id: 'family_name', desc: false }]
};
