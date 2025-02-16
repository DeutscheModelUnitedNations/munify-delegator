import type { SingleParticipant } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedSingleParticipant(
	options: Pick<SingleParticipant, 'conferenceId' | 'userId'> &
		Partial<Pick<SingleParticipant, 'applied' | 'assignedRoleId'>>
): SingleParticipant {
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
