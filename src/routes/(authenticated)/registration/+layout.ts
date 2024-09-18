import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ api, parent }) => {
	const { logoutUrl } = await checkForError(api.auth['logout-url'].get());
	const data = await parent();
	const userData = await checkForError(api.user({ id: data.user.sub }).get());

	return {
		logoutUrl,
		userData
	};
});
