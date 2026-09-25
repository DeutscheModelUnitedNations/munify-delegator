import { fetchMyConferenceParticipation } from '$lib/api/myConferenceParticipation';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();

	return {
		participation: await fetchMyConferenceParticipation({
			userId: user.sub,
			conferenceId: event.params.conferenceId
		})
	};
};
