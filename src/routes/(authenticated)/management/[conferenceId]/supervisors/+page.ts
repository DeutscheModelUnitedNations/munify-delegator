import type { PageLoad } from './$types';
import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { ConferenceSupervisor, User } from '@prisma/client';

export type ConferenceSupervisorData = ConferenceSupervisor & {
	user: Pick<User, 'id' | 'given_name' | 'family_name'>;
	_count: { delegations: number };
};

export const load: PageLoad = loadApiHandler(async ({ parent, api, url }) => {
	const { conferenceData } = await parent();

	const supervisors = await checkForError(
		api.conferenceSupervisor.get({ query: { conferenceId: conferenceData.id } })
	);

	return {
		supervisors,
		idQuery: url.searchParams.get('id') || undefined
	};
});
