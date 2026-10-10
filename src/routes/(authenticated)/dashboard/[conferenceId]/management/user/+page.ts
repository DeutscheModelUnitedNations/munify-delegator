import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** There is no user overview of its own; the participants table is where people are looked up. */
export const load: PageLoad = async ({ params }) => {
	redirect(303, `/dashboard/${params.conferenceId}/management/participants`);
};
