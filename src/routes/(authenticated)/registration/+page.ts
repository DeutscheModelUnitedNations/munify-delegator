import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { PageLoad } from './$types';

export const load: PageLoad = loadApiHandler(async ({ api }) => {
	const conferences = await checkForError(api.conference.get());

	return {
		conferences
	};
});
