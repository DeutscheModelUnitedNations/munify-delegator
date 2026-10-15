import { faker } from '@faker-js/faker';
import type * as schema from '../schema';

export function makeSeedDelegation(
	options: Pick<typeof schema.delegation.$inferInsert, 'conferenceId'> &
		Partial<Pick<typeof schema.delegation.$inferInsert, 'applied'>>
): typeof schema.delegation.$inferInsert {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		applied: options?.applied ?? faker.datatype.boolean(),
		assignedRoleId: null,
		entryCode: faker.string.numeric(6),
		experience: faker.lorem.sentence(),
		motivation: faker.lorem.sentence(),
		school: faker.lorem.word(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
