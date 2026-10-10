import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { PageLoad } from './$types';

/** The assignment has no landing page of its own; the sighting is where the work starts. */
export const load: PageLoad = ({ params }) => {
	redirect(
		307,
		resolve('/(authenticated)/dashboard/[conferenceId]/management/assignment/sighting', {
			conferenceId: params.conferenceId
		})
	);
};
