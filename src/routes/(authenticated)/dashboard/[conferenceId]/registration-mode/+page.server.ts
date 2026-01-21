import { myConferenceparticipationQuery } from '$lib/queries/myConferenceparticipationQuery';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { user } = await event.parent();

	const { data } = await myConferenceparticipationQuery.fetch({
		event,
		variables: { userId: user.sub, conferenceId: event.params.conferenceId },
		blocking: true
	});

	return {
		conferenceQueryData: data
	};
};
