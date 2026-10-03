import type { CustomConferenceRole } from '@prisma/client';
import { faker } from '@faker-js/faker';
import { CUSTOM_CONFERENCE_ROLES, type CustomConferenceRoleTemplate } from './catalog';

export function makeSeedCustomConferenceRole(
	options: Pick<CustomConferenceRole, 'conferenceId'> & Partial<CustomConferenceRoleTemplate>
): CustomConferenceRole {
	return {
		...faker.helpers.arrayElement(CUSTOM_CONFERENCE_ROLES),
		...options,
		id: faker.database.mongodbObjectId(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
