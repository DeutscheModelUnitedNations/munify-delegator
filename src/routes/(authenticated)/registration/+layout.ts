import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ api }) => {
	const { logoutUrl } = await checkForError(api.auth['logout-url'].get());

	return {
		logoutUrl
	};
});
