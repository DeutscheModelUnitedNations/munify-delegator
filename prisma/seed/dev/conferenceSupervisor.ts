import type { ConferenceSupervisor } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedConferenceSupervisor(
	options: Pick<ConferenceSupervisor, 'conferenceId' | 'userId'> &
		Partial<{
			supervisedDelegationMembers: { connect: { id: string }[] };
		}>
): ConferenceSupervisor {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		plansOwnAttendenceAtConference: faker.datatype.boolean(),
		connectionCode: faker.string.numeric(6),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
