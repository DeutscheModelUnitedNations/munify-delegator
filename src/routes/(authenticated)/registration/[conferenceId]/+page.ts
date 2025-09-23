import { graphql } from '$houdini';
import type { ConferenceRegistrationQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query ConferenceRegistrationQuery($conferenceId: String!, $userId: String!) {
		# findUniqueConference(where: { id: $conferenceId }) {
		# 	id
		# 	title
		# }
		findManyConferenceSupervisors(
			where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
		) {
			id
		}

		findManyDelegationMembers(
			where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
		) {
			id
		}
		findManySingleParticipants(
			where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
		) {
			id
		}
	}
`);

export const _ConferenceRegistrationQueryVariables: ConferenceRegistrationQueryVariables = async (
	event
) => {
	const { user } = await event.parent();
	return {
		userId: user.sub
	};
};
