import { myConferenceparticipationQuery } from '$lib/queries/myConferenceparticipationQuery';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();

	const { data } = await myConferenceparticipationQuery.fetch({
		event,
		variables: { userId: user.sub, conferenceId: event.params.conferenceId },
		blocking: true
	});

	const ofAgeAtConference =
		data?.findUniqueUser?.birthday && data?.findUniqueConference?.startConference
			? (new Date(data?.findUniqueConference?.startConference ?? '').getTime() -
					new Date(data?.findUniqueUser?.birthday ?? '').getTime()) /
					(1000 * 60 * 60 * 24 * 365.25) >=
				18
			: false;

	return {
		conferenceQueryData: data,
		ofAgeAtConference
	};
};
