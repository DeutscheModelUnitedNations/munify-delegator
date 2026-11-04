import { sql } from 'drizzle-orm';
import { SCHOOLS_COLUMNS } from '#lib/dataGrid/tables/schools';
import { col, wordsIn, type DataTableSource, type SourceArgs } from '../source';

/**
 * The schools of the people in a conference - participants, supervisors and those still on the
 * waiting list - each person by their own school, with how many people each sends. The table
 * reads its rows straight from here (`exposeValues`): they are counts, nothing more.
 */
function rows(args: SourceArgs) {
	const { conferenceId } = args;
	return sql`
		select s.id as id, s.name as name, s.city as city,
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
		join school s on s.id = p.school_id
		group by s.id
	`;
}

export const schoolsSource: DataTableSource = {
	key: 'schools',
	columns: SCHOOLS_COLUMNS,
	rows,
	search: (term) => wordsIn({ term, exprs: [col('name'), col('city')] }),
	tieBreak: [{ id: 'name', desc: false }],
	exposeValues: true
};
