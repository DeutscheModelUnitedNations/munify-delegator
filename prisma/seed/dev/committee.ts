import { Committee } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedCommittee(
	options: Pick<Committee, 'conferenceId'> &
		Partial<{
			nations: {
				connect: {
					alpha3Code: string;
				}[];
			};
		}>
): Committee {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		name: faker.company.name(),
		abbreviation: faker.company.name().slice(0, 3).toUpperCase(),
		numOfSeatsPerDelegation: faker.number.int({ min: 1, max: 3 })
	};
}
