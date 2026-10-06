import type { Committee } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { COMMITTEES, type CommitteeTemplate } from './catalog';

export function makeSeedCommittee(
	options: Pick<Committee, 'conferenceId'> &
		Partial<
			CommitteeTemplate & {
				nations: {
					connect: {
						alpha3Code: string;
					}[];
				};
			}
		>
): Committee & typeof options {
	return {
		...faker.helpers.arrayElement(COMMITTEES),
		resolutionHeadline: null,
		...options,
		id: faker.database.mongodbObjectId(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
