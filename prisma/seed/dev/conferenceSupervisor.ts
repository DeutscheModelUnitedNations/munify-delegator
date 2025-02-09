import type { ConferenceSupervisor } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedConferenceSupervisor(
	options: Pick<ConferenceSupervisor, 'conferenceId' | 'userId'> &
		Partial<{
			delegations: { connect: { id: string }[] };
			postAssignmentDelegeationMembers: { connect: { id: string }[] };
		}>
): ConferenceSupervisor {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		plansOwnAttendenceAtConference: faker.datatype.boolean()
	};
}
