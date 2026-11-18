import { sql } from 'drizzle-orm';
import { SCHOOLS_COLUMNS } from '#lib/dataGrid/tables/schools';
import { col, wordsIn, type DataTableSource, type SourceArgs } from '../source';

/**
 * Every school, each with how many people it sends to this conference - participants, supervisors
 * and those still on the waiting list, each person by their own school - and in how many
 * conferences, with how many participants, it took part overall. The table reads its rows
 * straight from here (`exposeValues`): they are counts, nothing more.
 */
function rows(args: SourceArgs) {
	const { conferenceId } = args;
	return sql`
		select s.id as id, s.name as name, s.city as city, s.is_foreign_school as foreign,
			coalesce(here.delegations, 0) as delegations,
			coalesce(here.participants, 0) as participants,
			coalesce(here.applied, 0) as applied,
			coalesce(here.seated, 0) as seated,
			coalesce(here.supervisors, 0) as supervisors,
			coalesce(here."waitingList", 0) as "waitingList",
			coalesce(overall.conferences, 0) as conferences,
			coalesce(overall.participants, 0) as "participantsOverall"
		from school s
		left join (
			select p.school_id,
				count(distinct p.delegation_id)::int as delegations,
				(count(*) filter (where p.kind in ('MEMBER', 'SINGLE')))::int as participants,
				(count(*) filter (where p.kind in ('MEMBER', 'SINGLE') and p.applied))::int as applied,
				(count(*) filter (where p.seated))::int as seated,
				(count(*) filter (where p.kind = 'SUPERVISOR'))::int as supervisors,
				(count(*) filter (where p.kind = 'WAITING'))::int as "waitingList"
			from (
				select cp.school_id, d.id as delegation_id, d.applied, d.assigned_role_id is not null as seated,
					'MEMBER' as kind
				from conference_participant cp
				join delegation_member dm on dm.conference_participant_id = cp.id
				join delegation d on d.id = dm.delegation_id
				where cp.conference_id = ${conferenceId} and cp.school_id is not null
				union all
				select cp.school_id, null, sp.applied, sp.assigned_role_id is not null, 'SINGLE'
				from single_participant sp join conference_participant cp on cp.id = sp.conference_participant_id
				where cp.conference_id = ${conferenceId} and cp.school_id is not null
				union all
				select cp.school_id, null, true, false, 'SUPERVISOR'
				from conference_supervisor cs join conference_participant cp on cp.id = cs.conference_participant_id
				where cp.conference_id = ${conferenceId} and cp.school_id is not null
				union all
				select w.school_id, null, false, false, 'WAITING'
				from waiting_list_entry w
				where w.conference_id = ${conferenceId} and w.school_id is not null and w.assigned_at is null
			) p
			group by p.school_id
		) here on here.school_id = s.id
		left join (
			-- delegation members and single participants of every conference
			select cp.school_id, count(distinct cp.conference_id)::int as conferences,
				count(*)::int as participants
			from conference_participant cp
			where cp.school_id is not null and (
				exists (select 1 from delegation_member dm where dm.conference_participant_id = cp.id)
				or exists (select 1 from single_participant sp where sp.conference_participant_id = cp.id)
			)
			group by cp.school_id
		) overall on overall.school_id = s.id
	`;
}

export const schoolsSource: DataTableSource = {
	key: 'schools',
	columns: SCHOOLS_COLUMNS,
	rows,
	// every word somewhere in the name or place, or a name close enough (a typo, another spelling)
	search: (term) =>
		sql`((${wordsIn({ term, exprs: [col('name'), col('city')] })}) or ${col('name')} % ${term})`,
	tieBreak: [{ id: 'name', desc: false }],
	exposeValues: true
};
