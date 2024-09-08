import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ api, url }) => {
	const userData = await checkForError(api.user.me.get());

	const conferences = await checkForError(api['my-conferences'].get());

	return {
		userData,
		conferences,
		url
	};
});
