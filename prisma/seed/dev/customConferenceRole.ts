import { CustomConferenceRole } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedCustomConferenceRole(
	options: Pick<CustomConferenceRole, 'conferenceId'>
): CustomConferenceRole {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		name: faker.company.name(),
		description: faker.lorem.sentence(),
		fontAwesomeIcon: null
	};
}
