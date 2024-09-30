import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { checkForError } from '$api/client';

import { loadApiHandler } from '$lib/helper/loadApiHandler';

export const load: PageLoad = loadApiHandler(async ({ params, api }) => {
	if (params.conferenceId === undefined) error(404, 'Not found');

	const statistics = await checkForError(
		api.conference({ id: params.conferenceId }).statistics.get()
	);

	return {
		conferenceId: params.conferenceId,
		statistics
	};
});
