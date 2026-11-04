import type { RouteId } from '$app/types';
import { resolve } from '$app/paths';
import { localizeHref } from '#lib/paraglide/runtime';
import { DEFAULT_HELP_DOCS, routeHelp } from './routeHelp';

/**
 * The help of a route: its manual page (the start page when it has none of its own) and its
 * tour. `specific` tells a page's own help from the fallback, for the menu's wording.
 */
export function helpForRoute(routeId: RouteId | null) {
	const help = routeId ? routeHelp[routeId] : undefined;
	const [slug, section] = (help?.docs ?? DEFAULT_HELP_DOCS).split('#');
	const path = resolve('/docs/[...slug]', { slug });
	return {
		manualHref: localizeHref(section ? `${path}#${section}` : path),
		tour: help?.tour,
		specific: help !== undefined
	};
}
