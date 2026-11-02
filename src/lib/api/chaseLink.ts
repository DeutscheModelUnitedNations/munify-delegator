import { client } from '#lib/api/rumbleClient/client';

/**
 * The CHASE instance this one is linked to, if any (`docs/plans/chase-link.md`). Everything about
 * CHASE in the UI - hints, links, settings - shows only while there is one. Everyone may read
 * where an active link points; a live query, so a link made or ended shows at once.
 */
export async function fetchActiveChaseLink() {
	const links = await client.liveQuery.instanceLinks({
		__args: { where: { status: 'ACTIVE' } },
		remoteUrl: true,
		status: true
	});
	return links.at(0);
}
