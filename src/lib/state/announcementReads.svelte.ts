import { SvelteSet } from 'svelte/reactivity';

/**
 * The announcements read in this browser since the page loaded. A feed that has received a live
 * update shows what the subscription sent, which the answer of "mark as read" does not reach, so
 * the feed and the urgent bar also ask here: both then agree at once, whatever their data came
 * from. Only ever written from a click, so never on the server.
 */
const readHere = new SvelteSet<string>();

export function noteAnnouncementsRead(ids: readonly string[]) {
	for (const id of ids) readHere.add(id);
}

/** Whether the reader has read the announcement: as the API says, or just now in this browser. */
export const isAnnouncementRead = (item: { id: string; read: boolean }) =>
	item.read || readHere.has(item.id);
