import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { PageLoad } from './$types';

export const load: PageLoad = loadApiHandler(async ({ api, params, url, parent }) => {
	const role = await checkForError(api.customConferenceRole({ id: params.roleId }).get());
	const user = (await parent()).user;
	const existingSingleParticipant = (
		await checkForError(
			api.singleParticipant.get({
				query: {
					conferenceId: params.conference,
					userId: user.sub
				}
			})
		)
	).at(0);
	return { conferenceId: params.conference, url, role, existingSingleParticipant };
});
