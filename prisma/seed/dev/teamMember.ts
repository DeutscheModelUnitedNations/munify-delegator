import { type TeamMember, TeamRole } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedTeamMember(
	options: Pick<TeamMember, 'conferenceId' | 'userId'> & Partial<Pick<TeamMember, 'role'>>
): TeamMember {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		role: options?.role ?? faker.helpers.arrayElement(Object.values(TeamRole)),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
