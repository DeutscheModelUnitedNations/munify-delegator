import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { PageLoad } from './$types';

export const load: PageLoad = loadApiHandler(async ({ api, params, url }) => {
	const conference = await checkForError(api.conference({ id: params.conference }).get());

	return { url, conference };
});
