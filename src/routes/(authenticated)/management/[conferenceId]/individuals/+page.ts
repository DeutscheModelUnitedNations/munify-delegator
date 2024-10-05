import type { PageLoad } from './$types';
import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';

export const load: PageLoad = loadApiHandler(async ({ parent, api, url }) => {
	const { conferenceData } = await parent();

	const singleParticipants = await checkForError(
		api.singleParticipant.get({ query: { conferenceId: conferenceData.id } })
	);

	return {
		singleParticipants,
		idQuery: url.searchParams.get('id') || undefined
	};
});
