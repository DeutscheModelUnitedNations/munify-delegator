import { Conference, Delegation } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedDelegation(
	options: {
		conference: Pick<Conference, 'id'>;
	} & Partial<{ delegation: Pick<Delegation, 'applied'> }>
): Delegation {
	return {
		id: faker.database.mongodbObjectId(),
		applied: options?.delegation?.applied ?? false,
		conferenceId: options.conference.id,
		assignedNationAlpha3Code: null,
		assignedNonStateActorId: null,
		entryCode: faker.string.numeric(6),
		experience: faker.lorem.sentence(),
		motivation: faker.lorem.sentence(),
		school: faker.lorem.word()
	};
}
