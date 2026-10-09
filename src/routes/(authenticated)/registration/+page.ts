import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** The conference selector is the dashboard; what a conference offers is decided there. */
export const load: PageLoad = () => {
	redirect(307, '/dashboard');
};
