import { faker } from '@faker-js/faker';
import type * as schema from '../schema';

export function makeSeedDelegationMember(
	options: Pick<
		typeof schema.delegationMember.$inferInsert,
		'conferenceId' | 'delegationId' | 'userId'
	> &
		Partial<
			Pick<typeof schema.delegationMember.$inferInsert, 'assignedCommitteeId' | 'isHeadDelegate'>
		>
): typeof schema.delegationMember.$inferInsert {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		isHeadDelegate: options?.isHeadDelegate ?? false,
		assignedCommitteeId: options?.assignedCommitteeId ?? null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
