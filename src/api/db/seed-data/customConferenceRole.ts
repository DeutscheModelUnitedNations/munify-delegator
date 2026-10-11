import { faker } from '@faker-js/faker';
import type * as schema from '../schema';

export function makeSeedCustomConferenceRole(
	options: Pick<typeof schema.customConferenceRole.$inferInsert, 'conferenceId'>
): typeof schema.customConferenceRole.$inferInsert {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		name: faker.company.name(),
		description: faker.lorem.sentence(),
		fontAwesomeIcon: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
