import { type TeamMember, TeamRole } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedTeamMember(
	options: Pick<TeamMember, 'conferenceId' | 'userId'>
): TeamMember {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		role: faker.helpers.arrayElement(Object.values(TeamRole))
	};
}
