import type { LayoutLoad } from './$types';
import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';

export const load: LayoutLoad = loadApiHandler(async ({ api, url, params }) => {
	const conferenceData = await checkForError(api.conference({ id: params.conference }).get());

	return { conferenceId: params.conference, conferenceData };
});
