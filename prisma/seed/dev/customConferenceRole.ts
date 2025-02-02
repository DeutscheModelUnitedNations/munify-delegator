import { Conference, CustomConferenceRole } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedCustomConferenceRole(options: { conference: Pick<Conference, 'id'> }): CustomConferenceRole {
	return {
		id: faker.database.mongodbObjectId(),
		name: faker.company.name(),
		conferenceId: options.conference.id,
		description: faker.lorem.sentence(),
		fontAwesomeIcon: null
	};
}
