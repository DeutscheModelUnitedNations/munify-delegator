import { goto } from '$app/navigation';
import { graphql, redirect } from '$houdini';
import { getRegistrationStatus } from '$lib/services/registrationStatus';
import type { LayoutLoad } from './$types';

const ConferenceStatusQuery = graphql(`
	query ConferenceStatusQuery($conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			state
			startAssignment
		}
	}
`);

export const load: LayoutLoad = async (event) => {
	const conferenceStatusQueryResult = await ConferenceStatusQuery.fetch({
		event,
		variables: { conferenceId: event.params.conferenceId }
	});

	switch (
		getRegistrationStatus(
			conferenceStatusQueryResult.data.findUniqueConference?.status,
			new Date(conferenceStatusQueryResult.data.findUniqueConference.startAssignment)
		)
	) {
		case 'CLOSED':
		case 'NOT_YET_OPEN':
		case 'UNKNOWN':
			redirect(307, '/registration');
			break;
		case 'WAITING_LIST':
			redirect(307, `${event.params.conferenceId}/waiting-list`);
	}

	return { conferenceId: event.params.conferenceId };
};
