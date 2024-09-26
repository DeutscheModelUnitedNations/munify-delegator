import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { TeamRole } from '@prisma/client';

export const load: LayoutLoad = loadApiHandler(async ({ params, api, parent }) => {
	const conferenceId = params.conferenceId;
	const { user } = await parent();
	const { mySystemRoles } = await checkForError(api.auth['my-system-roles'].get());
	const { teamMember } = await checkForError(api.user({ id: user.sub }).get());

	// Conference-specific role-based access control
	if (
		!mySystemRoles.includes('admin') &&
		!teamMember.find(
			(x) =>
				x.conferenceId === conferenceId &&
				(x.role === TeamRole.PROJECT_MANAGEMENT || x.role === TeamRole.PARTICIPANT_CARE)
		)
	) {
		error(403, 'Forbidden');
	}

	return {
		mySystemRoles,
		teamMemberships: teamMember
	};
});
