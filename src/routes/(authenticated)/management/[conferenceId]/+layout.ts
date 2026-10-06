import { error, redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';
import { managementRedirect } from '$lib/services/managementAccess';

export const load: LayoutLoad = async (event) => {
	const parentData = await event.parent();
	const conferenceId = event.params.conferenceId;

	const conference = parentData.conferences.find((c) => c.id === conferenceId);
	if (!conference) error(403, m.noAccess());

	const target = managementRedirect(conferenceId, event.url.pathname, conference.myMembership);
	if (target) redirect(302, target);

	return {
		conferenceId,
		myMembership: conference.myMembership
	};
};
