import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { applyHref } from '../apply/applyPaths';

// The application is one form on the conference's dashboard; this link opens it on its path.
export const load: PageLoad = ({ params, url }) => {
	redirect(
		307,
		applyHref({
			conferenceId: params.conferenceId,
			path: 'joinDelegation',
			extra: { code: url.searchParams.get('code') }
		})
	);
};
