import type { CalendarDay, CalendarEntry } from './calendarTypes';

/** The calendar date `now` falls on in `timezone`, as UTC-midnight milliseconds. */
function calendarDayIn(timezone: string, now: Date) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric'
	}).formatToParts(now);
	const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
	return Date.UTC(part('year'), part('month') - 1, part('day'));
}

/** The index of today's day in `days` (judged in `timezone`), or 0 when none is today. */
export function todayIndex(
	days: readonly Pick<CalendarDay, 'date'>[],
	timezone: string,
	now = new Date()
) {
	const today = calendarDayIn(timezone, now);
	const index = days.findIndex((day) => {
		const date = new Date(day.date);
		return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) === today;
	});
	return Math.max(index, 0);
}

/**
 * The track an entry's drawer names: the single track the entry has on the day, or its tracks
 * joined by name when it spans several.
 */
export function entryTrackSummary(
	day: Pick<CalendarDay, 'tracks'> | null,
	entry: Pick<CalendarEntry, 'tracks'> | null
) {
	const tracks = (day?.tracks ?? []).filter((track) =>
		entry?.tracks.some((t) => t.id === track.id)
	);
	if (tracks.length <= 1) return tracks[0] ?? null;
	return { name: tracks.map((t) => t.name).join(', '), description: null };
}
