import { graphql } from '$houdini';
import type { GetMyActiveConferencesQueryVariables } from './$houdini';

export const _houdini_load = graphql(`
	query GetMyActiveConferencesQuery($userId: String!) {
		findManyConferences(
			where: {
				OR: [
					{ conferenceSupervisors: { some: { userId: { equals: $userId } } } }
					{ delegationMembers: { some: { userId: { equals: $userId } } } }
					{ singleParticipants: { some: { userId: { equals: $userId } } } }
					{ teamMembers: { some: { userId: { equals: $userId } } } }
				]
			}
		) {
			id
			title
			startConference
			endConference
			startAssignment
			state
		}
	}
`);

export const _GetMyActiveConferencesQueryVariables: GetMyActiveConferencesQueryVariables = async (
	event
) => {
	const { user } = await event.parent();

	return {
		userId: user.sub
	};
};
