import { NonStateActor } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedNSA(options: Pick<NonStateActor, 'conferenceId'>): NonStateActor {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		name: faker.company.name(),
		abbreviation: faker.company.name().toUpperCase(),
		description: faker.lorem.sentence(),
		seatAmount: faker.number.int({ min: 1, max: 3 }),
		fontAwesomeIcon: null
	};
}
