import { sql, type SQL } from 'drizzle-orm';

/**
 * How many seats a person held in any conference - as a delegate of a seated delegation or as a
 * seated single participant - joined as `pc` on `userId` (a column of the outer query), only for
 * the queries that ask for it.
 */
export function participationCountJoin(userId: SQL) {
	return sql`left join (
		select seats.user_id, count(*) as n from (
			select p.user_id from delegation_member dm
			join conference_participant p on p.id = dm.conference_participant_id
			join delegation d on d.id = dm.delegation_id
			where d.assigned_role_id is not null
			union all
			select p.user_id from single_participant sp
			join conference_participant p on p.id = sp.conference_participant_id
			where sp.assigned_role_id is not null
		) seats group by seats.user_id
	) pc on pc.user_id = ${userId}`;
}
