import { error, redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';
import { managementRedirect } from '$lib/helpers/managementAccess';
import { managementMembership } from './managementMembership';

/**
 * Guards one conference: holding a privileged role elsewhere does not grant access here. Content
 * leads are kept on the seat planning, and the seat planning is kept to those who plan seats.
 */
export const load: LayoutLoad = async (event) => {
	const conferenceId = event.params.conferenceId;
	const membership = await managementMembership(conferenceId);
	if (!membership) error(403, m.noAccess());

	const target = managementRedirect(conferenceId, event.url.pathname, membership);
	if (target) redirect(302, target);
};
