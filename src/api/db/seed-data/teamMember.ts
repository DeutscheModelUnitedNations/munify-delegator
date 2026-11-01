import { faker } from '@faker-js/faker';
import type * as schema from '../schema';

const TEAM_ROLES = [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE',
	'MEMBER',
	'REVIEWER',
	'TEAM_COORDINATOR',
	'CONTENT_LEAD'
] as const;

export function makeSeedTeamMember(
	options: Pick<typeof schema.teamMember.$inferInsert, 'conferenceId' | 'userId'> &
		Partial<Pick<typeof schema.teamMember.$inferInsert, 'role'>>
): typeof schema.teamMember.$inferInsert {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		role: options?.role ?? faker.helpers.arrayElement(TEAM_ROLES),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
