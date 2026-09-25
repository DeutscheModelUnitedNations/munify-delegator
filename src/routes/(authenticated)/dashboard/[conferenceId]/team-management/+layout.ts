import { client } from '$lib/api/rumbleClient/client';
import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';

const ALLOWED_ROLES = ['PROJECT_MANAGEMENT', 'TEAM_COORDINATOR'];

export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();
	const conferenceId = event.params.conferenceId;
	const isAdmin = user.myOIDCRoles.includes('admin');

	if (isAdmin) {
		return { conferenceId, isAdmin };
	}

	const [teamMember] = await client.query.teamMembers({
		__args: {
			where: { conferenceId: { eq: conferenceId }, userId: { eq: user.sub } }
		},
		id: true,
		role: true
	});

	if (!teamMember || !ALLOWED_ROLES.includes(teamMember.role)) {
		error(403, m.noAccess());
	}

	return { conferenceId, isAdmin };
};
