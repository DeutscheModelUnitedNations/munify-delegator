import type { NonStateActor } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { NON_STATE_ACTORS, type NonStateActorTemplate } from './catalog';

export function makeSeedNSA(
	options: Pick<NonStateActor, 'conferenceId'> & Partial<NonStateActorTemplate>
): NonStateActor {
	return {
		...faker.helpers.arrayElement(NON_STATE_ACTORS),
		seatAmount: faker.number.int({ min: 1, max: 3 }),
		...options,
		id: faker.database.mongodbObjectId(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
