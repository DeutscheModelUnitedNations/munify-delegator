import { faker } from '@faker-js/faker';
import type { Insert } from './types';

export function makeSeedCommittee(
	options: Pick<Insert<'committee'>, 'conferenceId'>
): Insert<'committee'> {
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
