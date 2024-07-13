import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ api }) => {
	console.log("called");
	
	// const conferences = await checkForError(api.conference.get());

	// console.log(conferences);
	
	return {
		conferences
	};
});
