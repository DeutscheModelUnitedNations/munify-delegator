import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * Connecting to a supervisor is part of the dashboard's supervisor list now. Links supervisors
 * shared before still land there, with their code filled in.
 */
export const load: PageLoad = (event) => {
	const code = event.url.searchParams.get('code');
	const query = code ? `?supervisorCode=${encodeURIComponent(code)}` : '';
	redirect(307, `/dashboard/${event.params.conferenceId}${query}`);
};
