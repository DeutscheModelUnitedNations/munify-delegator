import { faker } from '@faker-js/faker';
import type { Insert } from '../rows';

export function makeSeedCustomConferenceRole(
	options: Pick<Insert<'customConferenceRole'>, 'conferenceId'>
): Insert<'customConferenceRole'> {
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
