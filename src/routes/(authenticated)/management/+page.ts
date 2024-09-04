import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { apiClient } from '$api/client';

export const load: PageLoad = async ({ params, fetch, url }) => {
	//TODO
	const conferences = await apiClient({ fetch, origin: url.origin }).conference.get();

	return {
		conferences: [
			{
				id: '1',
				location: 'Kiel',
				start: new Date('2025-03-01'),
				end: new Date('2025-03-05'),
				title: 'MUN-SH 2025'
			}
		]
	};
};
