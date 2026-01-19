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

const SupervisorStatusQuery = graphql(`
	query SupervisorStatusQuery($userId: String!, $conferenceId: String!) {
		findUniqueConferenceSupervisor(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
			supervisedDelegationMembers {
				delegation {
					id
				}
			}
		}
	}
`);

export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;

	const [teamMemberResult, supervisorResult] = await Promise.all([
		TeamMemberStatusQuery.fetch({
			event,
			variables: {
				userId: user.sub,
				conferenceId
			},
			blocking: true
		}),
		SupervisorStatusQuery.fetch({
			event,
			variables: {
				userId: user.sub,
				conferenceId
			},
			blocking: true
		})
	]);

	const supervisor = supervisorResult.data?.findUniqueConferenceSupervisor;
	const supervisedDelegationIds = [
		...new Set(supervisor?.supervisedDelegationMembers?.map((m) => m.delegation.id) ?? [])
	];

	return {
		conferenceId,
		teamMembers: teamMemberResult.data?.findManyTeamMembers ?? [],
		supervisor: supervisor ?? null,
		supervisedDelegationIds
	};
};
