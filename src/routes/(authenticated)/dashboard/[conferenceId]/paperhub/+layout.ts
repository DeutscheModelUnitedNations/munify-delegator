import { graphql } from '$houdini';
import type { LayoutLoad } from './$types';

const TeamMemberStatusQuery = graphql(`
	query TeamMemberStatusQuery($userId: String!, $conferenceId: String!) {
		findManyTeamMembers(
			where: {
				userId: { equals: $userId }
				conferenceId: { equals: $conferenceId }
				role: { in: [REVIEWER, PROJECT_MANAGEMENT, PARTICIPANT_CARE] }
			}
		) {
			id
			role
		}
	}
`);

export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;

	const teamMemberResult = await TeamMemberStatusQuery.fetch({
		event,
		variables: {
			userId: user.sub,
			conferenceId
		},
		blocking: true
	});

	return {
		conferenceId,
		teamMembers: teamMemberResult.data?.findManyTeamMembers ?? []
	};
};
