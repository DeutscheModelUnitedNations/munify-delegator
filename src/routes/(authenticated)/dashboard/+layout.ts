import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ api }) => {
	// const conferences = await checkForError(api.conference.get());

	const conferences = [
		{ id: '1', name: 'MUN-SH 2025', active: true },
		{ id: '2', name: 'MUNBW 2025', active: true },
		{ id: '3', name: 'MUN-SH 2024', active: false }
	];

	return {
		conferences
	};
});
