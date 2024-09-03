import { checkForError } from '$api/client';
import { loadApiHandler } from '$lib/helper/loadApiHandler';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = loadApiHandler(async ({ api, url }) => {
	const userData = await checkForError(api.user.me.get());

	const conferences = [];

	let delegationData;

	for (const membership of userData.delegationMemberships) {
		const conference = membership.conference;
		conferences.push(conference);
	}
	for (const membership of userData.conferenceSupervisor) {
		const conference = membership.conference;
		conferences.push(conference);
	}
	for (const membership of userData.singleParticipant) {
		const conference = membership.conference;
		conferences.push(conference);
	}
	for (const membership of userData.teamMember) {
		const conference = membership.conference;
		conferences.push(conference);
	}

	return {
		userData,
		conferences,
		url,
		delegationData
	};
});
