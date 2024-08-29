import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { PageLoad } from './$types';

export const load: PageLoad = loadApiHandler(async ({ api, params, url }) => {
	const code = url.searchParams.get('code');

	const delegationPreview = code
		? await api.delegation.preview.get({
				query: {
					entryCode: code,
					conferenceId: params.conference
				}
			})
		: undefined;

	return { conferenceId: params.conference, code, delegationPreview: delegationPreview?.data, url };
});
