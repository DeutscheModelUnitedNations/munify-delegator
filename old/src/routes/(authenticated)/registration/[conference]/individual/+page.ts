import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { PageLoad } from './$types';

export const load: PageLoad = loadApiHandler(async ({ api, params, url }) => {
	const availableCustomConferenceRoles = await checkForError(
		api.customConferenceRole.get({ query: { conferenceId: params.conference } })
	);

	return { conferenceId: params.conference, url, availableCustomConferenceRoles };
});
