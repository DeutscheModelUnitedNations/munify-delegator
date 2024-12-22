import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const projectId = params.projectId;

	if (projectId === undefined) error(404, 'Not found');

	return {
		projectId
	};
};
