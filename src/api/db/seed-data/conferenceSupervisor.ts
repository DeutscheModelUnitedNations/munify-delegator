import { faker } from '@faker-js/faker';
import type { Insert } from './types';

export function makeSeedConferenceSupervisor(
	options: Pick<Insert<'conferenceSupervisor'>, 'conferenceId' | 'userId'>
): Insert<'conferenceSupervisor'> {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		plansOwnAttendenceAtConference: faker.datatype.boolean(),
		connectionCode: faker.string.numeric(6),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
