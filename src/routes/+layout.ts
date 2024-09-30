import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { setApi } from '$lib/global/apiState.svelte';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ api }) => {
	setApi(api);

	return {
		api
	};
});
