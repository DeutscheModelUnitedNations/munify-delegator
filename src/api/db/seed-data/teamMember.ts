import { faker } from '@faker-js/faker';
import type { Insert } from '../rows';

const TEAM_ROLES = [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'MEMBER',
	'REVIEWER',
	'TEAM_COORDINATOR'
] as const;

export function makeSeedTeamMember(
	options: Pick<Insert<'teamMember'>, 'conferenceId' | 'userId'> &
		Partial<Pick<Insert<'teamMember'>, 'role'>>
): Insert<'teamMember'> {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		role: options?.role ?? faker.helpers.arrayElement(TEAM_ROLES),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
