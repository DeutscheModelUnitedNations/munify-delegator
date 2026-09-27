import { faker } from '@faker-js/faker';
import type { Insert } from '../rows';

export function makeSeedDelegation(
	options: Pick<Insert<'delegation'>, 'conferenceId'> &
		Partial<Pick<Insert<'delegation'>, 'applied'>>
): Insert<'delegation'> {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		applied: options?.applied ?? faker.datatype.boolean(),
		assignedNationAlpha3Code: null,
		assignedNonStateActorId: null,
		entryCode: faker.string.numeric(6),
		experience: faker.lorem.sentence(),
		motivation: faker.lorem.sentence(),
		school: faker.lorem.word(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
