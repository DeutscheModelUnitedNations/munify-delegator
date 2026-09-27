import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';
import { fetchMyManagedConferences } from '../myManagedConferences';

/** Guards one conference: holding a privileged role elsewhere does not grant access here. */
export const load: LayoutLoad = async (event) => {
	const managed = await fetchMyManagedConferences();

	if (!managed.some((conference) => conference.id === event.params.conferenceId)) {
		error(403, m.noAccess());
	}
};
