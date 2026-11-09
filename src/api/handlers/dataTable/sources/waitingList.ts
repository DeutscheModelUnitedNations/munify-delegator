import { sql, type SQL } from 'drizzle-orm';
import { WAITING_LIST_COLUMNS } from '#lib/dataGrid/tables/waitingList';
import { col, wordsIn, type DataTableSource, type SourceArgs } from '../source';
import { participationCountJoin } from './participationCount';
import { selectColumns } from './selectColumns';

/**
 * The waiting list: one row per entry of the conference, seated ones included (`seated`), hidden
 * ones too (`hidden`). An entry's place in the queue counts the visible entries still waiting, first
 * come, first served; seated and hidden entries have none.
 */
const VALUES: Record<string, SQL> = {
	position: sql`(case when w.assigned_at is null and not w.hidden then
		row_number() over (partition by (w.assigned_at is null and not w.hidden) order by w.created_at, w.id)
	end)::int`,
	createdAt: sql`w.created_at`,
	assignedAt: sql`w.assigned_at`,
	seated: sql`(w.assigned_at is not null)`,
	family_name: sql`u.family_name`,
	given_name: sql`u.given_name`,
	email: sql`u.email`,
	phone: sql`u.phone`,
	birthday: sql`u.birthday::date`,
	conferenceAge: sql`date_part('year', age(c.start_conference, u.birthday))::int`,
	participationCount: sql`coalesce(pc.n, 0)::int`,
	city: sql`u.city`,
	school: sql`sc.name`,
	motivation: sql`w.motivation`,
	experience: sql`w.experience`,
	requests: sql`w.requests`,
	hidden: sql`w.hidden`
};

function rows(args: SourceArgs) {
	const counted = args.uses.has('participationCount');
	const columns = WAITING_LIST_COLUMNS.filter(
		(column) => column.id !== 'participationCount' || counted
	);
	return sql`
		select w.id as id, ${selectColumns({ columns, valueOf: (id) => VALUES[id] ?? sql`null` })}
		from waiting_list_entry w
		join "user" u on u.id = w.user_id
		join conference c on c.id = w.conference_id
		left join school sc on sc.id = w.school_id
		${counted ? participationCountJoin(sql`w.user_id`) : sql``}
		where w.conference_id = ${args.conferenceId}
	`;
}

export const waitingListSource: DataTableSource = {
	key: 'waitingList',
	columns: WAITING_LIST_COLUMNS,
	rows,
	search: (term) =>
		wordsIn({
			term,
			exprs: [
				col('given_name'),
				col('family_name'),
				col('email'),
				col('school'),
				col('motivation'),
				col('experience'),
				col('requests')
			]
		}),
	tieBreak: [{ id: 'createdAt', desc: false }]
};
