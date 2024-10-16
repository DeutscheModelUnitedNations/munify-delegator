import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { checkForError } from '$api/client';

export const load: PageLoad = loadApiHandler(async ({ params, api }) => {
	if (params.conferenceId === undefined) error(404, 'Not found');

	const plausibility = await checkForError(
		api.conference({ id: params.conferenceId }).plausibility.get()
	);

	return {
		conferenceId: params.conferenceId,
		plausibility
	};
});
