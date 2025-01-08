import { myConferenceparticipationQuery } from '$lib/queries/myConferenceparticipationQuery';
import { ofAgeAtConference } from '$lib/services/ageChecker';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();

	const { data } = await myConferenceparticipationQuery.fetch({
		event,
		variables: { userId: user.sub, conferenceId: event.params.conferenceId },
		blocking: true
	});

	console.log(data)

	return {
		conferenceQueryData: data,
		ofAgeAtConference: ofAgeAtConference(
			data?.findUniqueConference?.startConference,
			data?.findUniqueUser?.birthday
		)
	};
};
