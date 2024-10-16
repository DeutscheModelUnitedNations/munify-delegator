import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { loadApiHandler } from '$lib/helper/loadApiHandler';

export const load: PageLoad = loadApiHandler(async ({ parent }) => {
	const data = await parent();

	if (data.myConferences.length === 1) {
		redirect(303, `/dashboard/${data.myConferences[0].id}`);
	}
});
