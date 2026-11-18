import { client } from '#lib/api/rumbleClient/client';
import { noteAnnouncementsRead } from '#lib/state/announcementReads.svelte.js';

/**
 * The caller's announcements of a conference, live. One selection for the dashboard's feed, the
 * archive page and the urgent bar, so they share a cache record and marking one read reaches all.
 */
export function fetchAnnouncementFeed(conferenceId: string) {
	return client.liveQuery.announcementFeed({
		__args: { conferenceId },
		id: true,
		title: true,
		body: true,
		importance: true,
		pinned: true,
		signature: true,
		publishAt: true,
		editedAt: true,
		read: true,
		attachments: { id: true, fileName: true, url: true }
	});
}

/** Marks the given announcements as read by the caller, here at once and for good in the API. */
export function markAnnouncementsRead({
	conferenceId,
	ids
}: {
	conferenceId: string;
	ids: string[];
}) {
	noteAnnouncementsRead(ids);
	return client.mutate.markAnnouncementsRead({
		__args: { conferenceId, ids },
		id: true,
		read: true
	});
}
