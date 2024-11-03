import type { PageLoad } from './$types';
import { graphql } from '$houdini';

const myParticipations = graphql(`
	query MyConferenceparticipationQuery($userId: String!, $conferenceId: String!) {
		findUniqueConference(where: { id: $conferenceId }) {
			id
			title
			startRegistration
			startConference
			startAssignment
			endConference
		}

		findUniqueDelegationMember(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
		}
		findUniqueConferenceSupervisor(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
		}
		findUniqueSingleParticipant(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
		}
	}
`);

export const load: PageLoad = async (event) => {
	const data = await event.parent();
	const participations = await myParticipations.fetch({
		variables: { userId: data.user.sub, conferenceId: event.params.conferenceId },
		event
	});

	return {
		delegationMember: participations.data?.findUniqueDelegationMember,
		supervisor: participations.data?.findUniqueConferenceSupervisor,
		singleParticipant: participations.data?.findUniqueSingleParticipant,
    conference: participations.data?.findUniqueConference!
	};
};
