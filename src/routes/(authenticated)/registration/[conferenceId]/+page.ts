import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** The overview of a conference's registration is part of its dashboard now. */
export const load: PageLoad = (event) => {
	redirect(307, `/dashboard/${event.params.conferenceId}`);
};
