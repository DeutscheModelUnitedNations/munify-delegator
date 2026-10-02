/** Pure decisions behind the calendar management tabs. */

interface TimedEntry {
	id: string;
	startTime: Date | string;
	endTime: Date | string;
	calendarTrackId?: string | null;
}

const timeOf = (time: Date | string) => new Date(time).getTime();

/**
 * Entries by start time, and entries starting together by their track's sort order. Entries
 * without a (known) track come first.
 */
export function sortEntriesByTimeAndTrack<E extends TimedEntry>(
	entries: readonly E[],
	tracks: readonly { id: string; sortOrder: number }[]
): E[] {
	const trackOrder = (entry: E) =>
		tracks.find((t) => t.id === entry.calendarTrackId)?.sortOrder ?? -1;
	return [...entries].sort(
		(a, b) => timeOf(a.startTime) - timeOf(b.startTime) || trackOrder(a) - trackOrder(b)
	);
}

function overlap(a: TimedEntry, b: TimedEntry) {
	return timeOf(a.startTime) < timeOf(b.endTime) && timeOf(b.startTime) < timeOf(a.endTime);
}

/** The ids of entries that overlap another entry of the same track. */
export function findOverlappingEntryIds(entries: readonly TimedEntry[]): Set<string> {
	const ids = new Set<string>();
	entries.forEach((a, i) => {
		for (const b of entries.slice(i + 1)) {
			if (a.calendarTrackId !== b.calendarTrackId || !overlap(a, b)) continue;
			ids.add(a.id);
			ids.add(b.id);
		}
	});
	return ids;
}

/** The day an entry should move to, or `undefined` when none (or its current one) is picked. */
export function moveTargetDay<D extends { id: string }>(
	days: readonly D[],
	targetDayId: string | null | undefined,
	currentDayId: string
): D | undefined {
	if (!targetDayId || targetDayId === currentDayId) return undefined;
	return days.find((d) => d.id === targetDayId);
}

/** The fields a track form writes; an empty description is stored as none. */
export function trackFields(name: string, description: string, sortOrder: number) {
	return { name, description: description || null, sortOrder };
}
