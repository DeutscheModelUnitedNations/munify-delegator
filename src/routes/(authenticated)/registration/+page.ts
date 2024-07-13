import { apiClient, checkForError } from '$api/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const conferences = await checkForError(
		apiClient({ fetch, origin: url.origin }).conference.get()
	);
	return { conferences };
};
