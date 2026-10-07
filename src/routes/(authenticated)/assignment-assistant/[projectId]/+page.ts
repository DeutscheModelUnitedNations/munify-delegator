import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/** The assistant has no landing page of its own; sighting is where the work starts. */
export const load: PageLoad = async ({ params }) => {
	redirect(307, `/assignment-assistant/${params.projectId}/sighting`);
};
