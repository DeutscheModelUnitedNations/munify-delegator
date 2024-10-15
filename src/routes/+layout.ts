import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { setApi } from '$lib/global/apiState.svelte';
import type { LayoutLoad } from './$types';
import { checkForError } from '$api/client';
import { setLogoutUrl } from '$lib/global/logoutUrl.svelte';

export const load: LayoutLoad = loadApiHandler(async ({ api }) => {
	setApi(api);

	const { logoutUrl } = await checkForError(api.auth['logout-url'].get());
	setLogoutUrl(logoutUrl);

	return {
		api,
		logoutUrl
	};
});
