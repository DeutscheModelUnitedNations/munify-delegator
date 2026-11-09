import { sql, type SQL } from 'drizzle-orm';
import { TEAM_MEMBERS_COLUMNS } from '#lib/dataGrid/tables/teamMembers';
import { col, wordsIn, type DataTableSource, type SourceArgs } from '../source';
import { selectColumns } from './selectColumns';

/**
 * The conference's team: one row per team member. A profile is complete with everything the
 * conference asks of its team on paper: birthday, phone, address, gender and food preference.
 * Only team admins open the table, who read all of it.
 */
const filled = (expr: SQL) => sql`coalesce(btrim(${expr}), '') <> ''`;

const VALUES: Record<string, SQL> = {
	family_name: sql`u.family_name`,
	given_name: sql`u.given_name`,
	email: sql`u.email`,
	phone: sql`u.phone`,
	role: sql`tm.role::text`,
	profileComplete: sql`(u.birthday is not null and ${filled(sql`u.phone`)} and ${filled(sql`u.street`)}
		and ${filled(sql`u.zip`)} and ${filled(sql`u.city`)} and ${filled(sql`u.country`)}
		and u.gender is not null and u.food_preference is not null)`,
	joinedAt: sql`tm.created_at`
};

function rows(args: SourceArgs) {
	return sql`
		select tm.id as id, ${selectColumns({
			columns: TEAM_MEMBERS_COLUMNS,
			valueOf: (id) => VALUES[id] ?? sql`null`
		})}
		from team_member tm
		join "user" u on u.id = tm.user_id
		where tm.conference_id = ${args.conferenceId}
	`;
}

export const teamMembersSource: DataTableSource = {
	key: 'teamMembers',
	columns: TEAM_MEMBERS_COLUMNS,
	rows,
	search: (term) => wordsIn({ term, exprs: [col('given_name'), col('family_name'), col('email')] }),
	tieBreak: [{ id: 'joinedAt', desc: false }]
};
