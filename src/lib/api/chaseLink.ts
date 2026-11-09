import { client } from '#lib/api/rumbleClient/client';

/**
 * The CHASE instance this one is linked to, if any (`docs/plans/chase-link.md`). Everything about
 * CHASE in the UI - hints, links, settings - shows only while there is one. Everyone may read
 * where the link points; the row exists while the link is configured.
 */
export async function fetchActiveChaseLink() {
	const links = await client.liveQuery.instanceLinks({
		remoteUrl: true,
		lastReconcileAt: true
	});
	return links.at(0);
}
