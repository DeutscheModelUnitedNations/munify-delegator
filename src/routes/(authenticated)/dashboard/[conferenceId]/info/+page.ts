/**
 * @deprecated LEGACY PAGE - No links lead to this page anymore.
 * Conference info/announcements are now displayed directly on the dashboard
 * via the AnnouncementContent component. This page is kept for backwards
 * compatibility with any bookmarked URLs but may be removed in the future.
 */

import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		conference: await client.query.conference({
			__args: { id: event.params.conferenceId },
			id: true,
			title: true,
			info: true
		})
	};
};
