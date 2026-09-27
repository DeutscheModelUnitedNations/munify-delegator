import { faker } from '@faker-js/faker';
import type { Insert } from './types';

export function makeSeedNSA(
	options: Pick<Insert<'nonStateActor'>, 'conferenceId'>
): Insert<'nonStateActor'> {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		name: faker.company.name(),
		abbreviation: faker.company.name().toUpperCase(),
		description: faker.lorem.sentence(),
		seatAmount: faker.number.int({ min: 1, max: 3 }),
		fontAwesomeIcon: null,
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
