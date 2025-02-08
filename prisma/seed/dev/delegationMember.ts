import { DelegationMember } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedDelegationMember(
	options: Pick<DelegationMember, 'conferenceId' | 'delegationId' | 'userId'> &
		Partial<Pick<DelegationMember, 'assignedCommitteeId' | 'isHeadDelegate'>>
): DelegationMember {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		isHeadDelegate: options?.isHeadDelegate ?? false,
		assignedCommitteeId: options?.assignedCommitteeId ?? null
	};
}
