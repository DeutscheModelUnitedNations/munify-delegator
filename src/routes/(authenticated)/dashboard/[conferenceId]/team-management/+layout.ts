import { graphql } from '$houdini';
import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';

const teamMemberAccessCheck = graphql(`
	query TeamMemberAccessCheck($conferenceId: String!, $userId: String!) {
		findUniqueTeamMember(
			where: { conferenceId_userId: { conferenceId: $conferenceId, userId: $userId } }
		) {
			id
			role
		}
	}
`);

export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;

	// System admins can access
	if (user.myOIDCRoles.includes('admin')) {
		return {
			conferenceId
		};
	}

	// Check if user is team member with appropriate role
	const { data } = await teamMemberAccessCheck.fetch({
		event,
		variables: { conferenceId, userId: user.sub },
		blocking: true
	});

	const teamMember = data?.findUniqueTeamMember;
	const allowedRoles = ['PROJECT_MANAGEMENT', 'TEAM_COORDINATOR'];

	if (!teamMember || !allowedRoles.includes(teamMember.role)) {
		error(403, m.noAccess());
	}

	return {
		conferenceId
	};
};
