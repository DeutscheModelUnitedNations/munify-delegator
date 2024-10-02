import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	if (params.conferenceId === undefined) error(404, 'Not found');

	return {
		conferenceId: params.conferenceId
	};
};
