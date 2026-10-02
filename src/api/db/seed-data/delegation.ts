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

/**
 * Gives a seeded delegation a role: the nation or the non-state actor, chosen at random. A role
 * that is missing (the pool ran out) leaves the delegation without one.
 */
export function assignSeedRole(
	delegation: Insert<'delegation'>,
	nation: { alpha3Code: string } | undefined,
	nonStateActor: { id?: string } | undefined
) {
	if (faker.datatype.boolean()) {
		delegation.assignedNationAlpha3Code = nation?.alpha3Code ?? null;
	} else {
		delegation.assignedNonStateActorId = nonStateActor?.id ?? null;
	}
}
