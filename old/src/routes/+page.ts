import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { languageTag } from '$lib/paraglide/runtime';
import type { PageLoad } from './$types';

export const load: PageLoad = loadApiHandler(async ({ api, parent }) => {
	const conferences = await checkForError(
		api.conference.get({
			query: {}
		})
	);

	return {
		conferences
	};
});
