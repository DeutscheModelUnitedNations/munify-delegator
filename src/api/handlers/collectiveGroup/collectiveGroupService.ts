import { db, schema } from '#api/db/db';
import { and, eq, isNotNull, or } from 'drizzle-orm';
import { joinMemberSchool } from '#api/handlers/school/memberSchool';
import { collectiveGroups, type SupervisedStudent } from './collectiveGroups';

/**
 * The conference's groups decided together (`collectiveGroups`), up to its
 * `maxCollectiveGroupSize`: every supervision of a student with a school who applied, as a
 * delegation member or a single participant, and the applied delegation members with a school, of
 * whom a supervised member brings in their delegation's.
 */
export async function loadCollectiveGroups(conferenceId: string) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { maxCollectiveGroupSize: true }
	});
	const limit = conference?.maxCollectiveGroupSize ?? null;
	if (limit === null) return [];

	const rows = await db
		.select({
			supervisorId: schema.supervision.a,
			schoolId: schema.school.id,
			schoolName: schema.school.name,
			isForeignSchool: schema.school.isForeignSchool,
			delegationMemberId: schema.delegationMember.id,
			delegationId: schema.delegation.id,
			singleParticipantId: schema.singleParticipant.id
		})
		.from(schema.supervision)
		.innerJoin(
			schema.conferenceParticipant,
			eq(schema.conferenceParticipant.id, schema.supervision.b)
		)
		.innerJoin(schema.school, eq(schema.school.id, schema.conferenceParticipant.schoolId))
		.leftJoin(
			schema.delegationMember,
			eq(schema.delegationMember.conferenceParticipantId, schema.conferenceParticipant.id)
		)
		.leftJoin(
			schema.delegation,
			and(
				eq(schema.delegation.id, schema.delegationMember.delegationId),
				eq(schema.delegation.applied, true)
			)
		)
		.leftJoin(
			schema.singleParticipant,
			and(
				eq(schema.singleParticipant.conferenceParticipantId, schema.conferenceParticipant.id),
				eq(schema.singleParticipant.applied, true)
			)
		)
		.where(
			and(
				eq(schema.conferenceParticipant.conferenceId, conferenceId),
				or(isNotNull(schema.delegation.id), isNotNull(schema.singleParticipant.id))
			)
		);

	const members = await joinMemberSchool(
		db
			.select({
				delegationMemberId: schema.delegationMember.id,
				delegationId: schema.delegation.id,
				schoolId: schema.school.id
			})
			.from(schema.delegationMember)
			.innerJoin(
				schema.delegation,
				and(
					eq(schema.delegation.id, schema.delegationMember.delegationId),
					eq(schema.delegation.applied, true)
				)
			)
			.$dynamic()
	).where(eq(schema.delegation.conferenceId, conferenceId));

	return collectiveGroups({ students: rows.flatMap(studentOf), members, limit });
}

/** A row of the supervisions as a student; one that is neither (cannot happen) is left out. */
function studentOf(row: {
	supervisorId: string;
	schoolId: string;
	schoolName: string;
	isForeignSchool: boolean;
	delegationMemberId: string | null;
	delegationId: string | null;
	singleParticipantId: string | null;
}): SupervisedStudent[] {
	const base = {
		supervisorId: row.supervisorId,
		school: { id: row.schoolId, name: row.schoolName, isForeignSchool: row.isForeignSchool }
	};
	if (row.delegationMemberId && row.delegationId) {
		return [
			{
				...base,
				kind: 'member',
				delegationMemberId: row.delegationMemberId,
				delegationId: row.delegationId
			}
		];
	}
	if (row.singleParticipantId) {
		return [{ ...base, kind: 'single', singleParticipantId: row.singleParticipantId }];
	}
	return [];
}
