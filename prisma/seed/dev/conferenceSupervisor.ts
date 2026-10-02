import type { ConferenceSupervisor } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { entryCodeAlphabet, entryCodeLength } from '../../../src/api/services/entryCodeGenerator';

type ConnectById = { connect: { id: string }[] };

export function makeSeedConferenceSupervisor(
	options: Pick<ConferenceSupervisor, 'conferenceId' | 'userId'> &
		Partial<{
			supervisedDelegationMembers: ConnectById;
			supervisedSingleParticipants: ConnectById;
		}>
): ConferenceSupervisor & typeof options {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		plansOwnAttendenceAtConference: faker.datatype.boolean(),
		// same format as the API's makeEntryCode(), but drawn from faker so the seed stays reproducible
		connectionCode: faker.string.fromCharacters(entryCodeAlphabet, entryCodeLength),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
