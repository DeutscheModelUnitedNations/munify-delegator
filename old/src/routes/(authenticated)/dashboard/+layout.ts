import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ api, url }) => {
	const myConferences = await checkForError(api.conference.get({ query: { participating: true } }));

	if (myConferences.length === 0) {
		throw redirect(303, '/dashboard/no-conference');
	}

	return {
		myConferences,
		url
	};
});
