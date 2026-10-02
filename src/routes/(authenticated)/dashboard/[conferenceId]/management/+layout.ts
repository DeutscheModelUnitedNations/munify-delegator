import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';
import { canManageConference } from './canManageConference';

/** Guards one conference: holding a privileged role elsewhere does not grant access here. */
export const load: LayoutLoad = async (event) => {
	if (!(await canManageConference(event.params.conferenceId))) {
		error(403, m.noAccess());
	}
};
