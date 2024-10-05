import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { TeamRole } from '@prisma/client';

export const load: LayoutLoad = loadApiHandler(async ({ api, parent, url }) => {
	const { user } = await parent();
	const { mySystemRoles } = await checkForError(api.auth['my-system-roles'].get());
	const { teamMember } = await checkForError(api.user({ id: user.sub }).get());

	// General role-based access control
	if (
		!mySystemRoles.includes('admin') &&
		!teamMember.some(
			(team) => team.role === TeamRole.PROJECT_MANAGEMENT || team.role === TeamRole.PARTICIPANT_CARE
		)
	) {
		error(403, 'Forbidden');
	}

	const { logoutUrl } = await checkForError(api.auth['logout-url'].get());

	return {
		mySystemRoles,
		teamMemberships: teamMember,
		url,
		logoutUrl
	};
});
