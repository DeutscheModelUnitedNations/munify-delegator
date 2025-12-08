import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, route, url, parent }) => {
	const parentData = await parent();
	redirect(307, `/assignment-assistant/${parentData.projectId}/sighting`);
};
