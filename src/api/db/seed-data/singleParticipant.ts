import { faker } from '@faker-js/faker';
import type * as schema from '../schema';

export function makeSeedSingleParticipant(
	options: Pick<typeof schema.singleParticipant.$inferInsert, 'conferenceParticipantId'> &
		Partial<Pick<typeof schema.singleParticipant.$inferInsert, 'applied' | 'assignedRoleId'>>
): typeof schema.singleParticipant.$inferInsert {
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
