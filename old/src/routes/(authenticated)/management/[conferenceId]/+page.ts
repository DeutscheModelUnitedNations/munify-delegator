import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const conferenceId = params.conferenceId;

	if (conferenceId === undefined) error(404, 'Not found');

	redirect(302, `/management/${conferenceId}/stats`);
};
