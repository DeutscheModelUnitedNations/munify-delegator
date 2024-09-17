import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';

export const load: PageLoad = loadApiHandler(async ({ api, url, parent }) => {
	const data = await parent();

	if (data.conferences.length === 1) {
		redirect(303, `/dashboard/${data.conferences[0].id}`);
	}

	const { logoutUrl } = await checkForError(api.auth['logout-url'].get());
	return {
		logoutUrl
	};
});
