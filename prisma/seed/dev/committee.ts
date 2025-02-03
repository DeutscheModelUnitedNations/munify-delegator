import { Committee, Conference } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedCommittee(options: Pick<Committee, 'conferenceId'>): Committee {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		name: faker.company.name(),
		abbreviation: faker.company.name().slice(0, 3).toUpperCase(),
		numOfSeatsPerDelegation: faker.number.int({ min: 1, max: 3 })
	};
}
