import type { PageLoad } from './$types';
import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';

export const load: PageLoad = loadApiHandler(async ({ parent, api, url }) => {
	const { conferenceData } = await parent();

	const participants = await checkForError(
		api.user.perConference({ conferenceId: conferenceData.id }).get()
	);

	return {
		participants,
		idQuery: url.searchParams.get('id') || undefined
	};
});
