import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';
import { fetchMyManagedConferences } from './myManagedConferences';

/**
 * Guards the whole management area: without a privileged role in at least one conference there is
 * nothing here to see. A `load` because it has to answer before anything renders; the list itself
 * is fetched by the pages that show it.
 */
export const load: LayoutLoad = async () => {
	if ((await fetchMyManagedConferences()).length === 0) {
		error(403, m.noAccess());
	}
};
