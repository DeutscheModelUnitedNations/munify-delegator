import type { PageLoad } from './$types';

export const load: PageLoad = ({ params, url }) => {
	return { conferenceId: params.conference, code: url.searchParams.get('code') };
};
