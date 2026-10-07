import { faker } from '@faker-js/faker';
import type { Insert } from '../rows';

export function makeSeedDelegationMember(
	options: Pick<Insert<'delegationMember'>, 'conferenceId' | 'delegationId' | 'userId'> &
		Partial<Pick<Insert<'delegationMember'>, 'assignedCommitteeId' | 'isHeadDelegate'>>
): Insert<'delegationMember'> {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		isHeadDelegate: options?.isHeadDelegate ?? false,
		assignedCommitteeId: options?.assignedCommitteeId ?? null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
