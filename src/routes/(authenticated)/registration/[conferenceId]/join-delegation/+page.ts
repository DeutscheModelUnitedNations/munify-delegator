import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { applyHref } from '../apply/applyPaths';

// The application is one form on the conference's dashboard; this link opens it on its path.
export const load: PageLoad = ({ params, url }) => {
	redirect(
		307,
		applyHref(params.conferenceId, 'joinDelegation', { code: url.searchParams.get('code') })
	);
};
