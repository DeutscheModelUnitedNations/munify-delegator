import { faker } from '@faker-js/faker';
import type { Insert } from './types';

export function makeSeedSingleParticipant(
	options: Pick<Insert<'singleParticipant'>, 'conferenceId' | 'userId'> &
		Partial<Pick<Insert<'singleParticipant'>, 'applied' | 'assignedRoleId'>>
): Insert<'singleParticipant'> {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		applied: options?.applied ?? faker.datatype.boolean(),
		assignmentDetails: faker.lorem.sentence(),
		experience: faker.lorem.sentence(),
		motivation: faker.lorem.sentence(),
		school: faker.lorem.word(),
		assignedRoleId: options?.assignedRoleId ?? null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
