import { error, redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params, route, url }) => {
	const projectId = params.projectId;

	if (projectId === undefined) error(404, 'Not found');

	return {
		projectId,
		tab: route.id?.split('/').pop()
	};
};
