import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';

export const load: LayoutLoad = async (event) => {
	const parentData = await event.parent();

	if (!parentData.conferences.map((c) => c.id).includes(event.params.conferenceId))
		error(403, m.noAccess());

	return {
		conferenceId: event.params.conferenceId
	};
};
