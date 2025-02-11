import type { Delegation } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedDelegation(
	options: Pick<Delegation, 'conferenceId'> & Partial<Pick<Delegation, 'applied'>>
): Delegation {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		applied: options?.applied ?? faker.datatype.boolean(),
		assignedNationAlpha3Code: null,
		assignedNonStateActorId: null,
		entryCode: faker.string.numeric(6),
		experience: faker.lorem.sentence(),
		motivation: faker.lorem.sentence(),
		school: faker.lorem.word()
	};
}
