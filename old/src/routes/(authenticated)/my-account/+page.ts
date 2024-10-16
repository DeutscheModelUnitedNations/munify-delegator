import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { PageLoad } from './$types';

export const load: PageLoad = loadApiHandler(async ({ url, api, parent }) => {
	const { user } = await parent();
	await api.auth['trigger-user-data-refresh'].post();
	const fullUser = await checkForError(api.user({ id: user.sub }).get());
	const { mySystemRoles } = await checkForError(api.auth['my-system-roles'].get());
	return {
		redirectUrl: url.searchParams.get('redirect') || null,
		fullUser,
		mySystemRoles,
		url
	};
});
