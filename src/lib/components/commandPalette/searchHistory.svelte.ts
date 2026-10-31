import { client } from '#lib/api/rumbleClient/client';
import { nanoid } from '#lib/helpers/nanoid';

/** How long a search made on another device stays on offer as a hint. */
export const HANDOFF_WINDOW_MS = 20_000;

/** How many past searches the empty search offers. */
export const HISTORY_SHOWN = 5;

export interface SearchHistoryEntry {
	id: string;
	label: string;
	resultId: string;
}

let history = $state<SearchHistoryEntry[]>([]);
let available = $state<SearchHistoryEntry | null>(null);
let consumedId = $state<string | null>(null);
let origin: string | undefined;

/** Names this browser tab, so it does not offer itself the searches it made. */
export function historyOrigin() {
	origin ??= nanoid();
	return origin;
}

/** The newest searches, newest first. */
export function getSearchHistory() {
	return history;
}

export function setSearchHistory(entries: SearchHistoryEntry[]) {
	history = entries;
}

/** The search another device made within the window, if any and not yet taken over here. */
export function getAvailableHandoff() {
	return available && available.id !== consumedId ? available : null;
}

export function setAvailableHandoff(entry: SearchHistoryEntry | null) {
	available = entry;
}

export function consumeHandoff(id: string) {
	consumedId = id;
}

async function scannedPersonName(userId: string) {
	try {
		const person = await client.query.user({
			__args: { id: userId },
			givenName: true,
			familyName: true
		});
		return `${person.givenName} ${person.familyName}`;
	} catch {
		return userId;
	}
}

/**
 * Writes a picked result to the history. Best effort: a failed entry must never get in the way of
 * opening the result.
 */
export async function recordSearch({
	conferenceId,
	resultId,
	label
}: {
	conferenceId: string;
	resultId: string;
	label: string;
}) {
	try {
		await Promise.resolve(
			client.mutate.recordSearch({
				__args: { conferenceId, originId: historyOrigin(), resultId, label }
			})
		);
	} catch {
		// nothing to tell the person: the result opened all the same
	}
}

/** A scan resolves to a person, who is recorded under their name. */
export async function recordScan({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	await recordSearch({ conferenceId, resultId: userId, label: await scannedPersonName(userId) });
}
