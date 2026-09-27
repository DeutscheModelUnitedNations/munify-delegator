import { client } from '$lib/api/rumbleClient/client';
import { fetchCurrentUser } from '$lib/api/currentUser';
import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';

const ALLOWED_ROLES = ['PROJECT_MANAGEMENT', 'TEAM_COORDINATOR'];

export const load: LayoutLoad = async (event) => {
	const user = await fetchCurrentUser();
	const isAdmin = user.myOIDCRoles.includes('admin');

	if (isAdmin) return;

	const [teamMember] = await client.query.teamMembers({
		__args: {
			where: { conferenceId: { eq: event.params.conferenceId }, userId: { eq: user.sub } }
		},
		id: true,
		role: true
	});

	if (!teamMember || !ALLOWED_ROLES.includes(teamMember.role)) {
		error(403, m.noAccess());
	}
};
