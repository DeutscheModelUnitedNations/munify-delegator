import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
	const code = url.searchParams.get('code');

	return { conferenceId: params.conferenceId, code };
};
