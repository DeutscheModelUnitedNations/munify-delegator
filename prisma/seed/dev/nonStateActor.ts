import { Conference, NonStateActor } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedNSA(options: { conference: Pick<Conference, 'id'> }): NonStateActor {
	return {
		id: faker.database.mongodbObjectId(),
		name: faker.company.name(),
		abbreviation: faker.company.name().slice(0, 3).toUpperCase(),
		conferenceId: options.conference.id,
		description: faker.lorem.sentence(),
		seatAmount: faker.number.int({ min: 1, max: 3 }),
		fontAwesomeIcon: null
	};
}
