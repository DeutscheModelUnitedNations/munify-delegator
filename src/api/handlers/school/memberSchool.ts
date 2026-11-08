import { schema } from '#api/db/db';
import { eq } from 'drizzle-orm';
import type { PgSelect } from 'drizzle-orm/pg-core';

/**
 * Joins a select over delegation members (`.$dynamic()`) with each member's own school, through
 * their participant row: a school is the person's, not the delegation's. Members without a school
 * drop out.
 */
export function joinMemberSchool<T extends PgSelect>(query: T) {
	return query
		.innerJoin(
			schema.conferenceParticipant,
			eq(schema.conferenceParticipant.id, schema.delegationMember.conferenceParticipantId)
		)
		.innerJoin(schema.school, eq(schema.school.id, schema.conferenceParticipant.schoolId));
}
