import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	return { conferenceId: params.conference };
};
