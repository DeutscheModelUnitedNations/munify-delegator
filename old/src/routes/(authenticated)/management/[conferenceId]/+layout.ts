import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ params, api, parent }) => {
	const conferenceId = params.conferenceId;
	const { user } = await parent();
	const { mySystemRoles } = await checkForError(api.auth['my-system-roles'].get());
	const { teamMember } = await checkForError(api.user({ id: user.sub }).get());
	const conferenceData = await checkForError(api.conference({ id: conferenceId }).get());

	// Conference-specific role-based access control
	if (
		!mySystemRoles.includes('admin') &&
		!teamMember.find(
			(x) =>
				x.conferenceId === conferenceId &&
				(x.role === 'PROJECT_MANAGEMENT' || x.role === 'PARTICIPANT_CARE')
		)
	) {
		error(403, 'Forbidden');
	}

	return {
		mySystemRoles,
		teamMemberships: teamMember,
		conferenceData
	};
});
