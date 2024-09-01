import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { PageLoad } from './$types';

export const load: PageLoad = loadApiHandler(async ({ url, api }) => {
	const fullUser = await checkForError(api.user.me.get());
	return {
		redirectUrl: url.searchParams.get('redirect') || null,
		fullUser,
		url
	};
});
