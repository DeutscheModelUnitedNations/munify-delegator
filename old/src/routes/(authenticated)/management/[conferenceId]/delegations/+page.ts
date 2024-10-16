import type { PageLoad } from './$types';
import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';

export const load: PageLoad = loadApiHandler(async ({ parent, api, url }) => {
	const { conferenceData } = await parent();

	const delegations = await checkForError(
		api.delegation.get({ query: { conferenceId: conferenceData.id } })
	);

	return {
		delegations,
		idQuery: url.searchParams.get('id') || undefined
	};
});
