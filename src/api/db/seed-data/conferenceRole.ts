import { faker } from '@faker-js/faker';
import type * as schema from '../schema';

/** A custom role for single participants. */
export function makeSeedCustomConferenceRole(
	options: Pick<typeof schema.conferenceRole.$inferInsert, 'conferenceId'>
): typeof schema.conferenceRole.$inferInsert {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		kind: 'CUSTOM',
		name: faker.company.name(),
		description: faker.lorem.sentence(),
		fontAwesomeIcon: null,
		seatAmount: 1,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
