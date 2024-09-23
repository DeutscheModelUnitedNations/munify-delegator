import type { PageLoad } from './$types';
import { loadApiHandler } from '$lib/helper/loadApiHandler';

export const load: PageLoad = loadApiHandler(async ({ api }) => {
	const conferences = await api.conference.get();
	return { conferences };
});
