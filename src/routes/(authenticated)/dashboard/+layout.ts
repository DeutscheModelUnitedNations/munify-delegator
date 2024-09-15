import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ api, url, parent }) => {
	const { user } = await parent();
	const userData = await checkForError(api.user({ id: user.sub }).get());

	const conferences = await checkForError(api['my-conferences'].get());

	return {
		userData,
		conferences,
		url
	};
});
