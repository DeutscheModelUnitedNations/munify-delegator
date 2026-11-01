import { faker } from '@faker-js/faker';
import type * as schema from '../schema';

export function makeSeedCommittee(
	options: Pick<typeof schema.committee.$inferInsert, 'conferenceId'>
): typeof schema.committee.$inferInsert {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		name: faker.company.name(),
		abbreviation: faker.company.name().slice(0, 3).toUpperCase(),
		numOfSeatsPerDelegation: faker.number.int({ min: 1, max: 3 }),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
