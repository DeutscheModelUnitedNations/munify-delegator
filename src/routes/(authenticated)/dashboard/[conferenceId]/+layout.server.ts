import { fetchMyConferenceParticipation } from '$lib/api/myConferenceParticipation';
import { ofAgeAtConference } from '$lib/helpers/ageChecker';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const { user } = await event.parent();

	const participation = await fetchMyConferenceParticipation({
		userId: user.sub,
		conferenceId: event.params.conferenceId
	});

	return {
		participation,
		ofAgeAtConference: ofAgeAtConference(
			participation.conference?.startConference,
			participation.user?.birthday
		)
	};
};
