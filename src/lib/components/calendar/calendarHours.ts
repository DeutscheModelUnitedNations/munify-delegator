/** The hour of the day (UTC) a time falls on, as a fraction: 9:30 is 9.5. */
export function utcHourOf(time: string | Date) {
	const date = new Date(time);
	return date.getUTCHours() + date.getUTCMinutes() / 60;
}

/**
 * The hour an entry ends on, counted from the start of the day it starts on, so an entry running
 * to midnight (or past it) ends at 24 (or later) rather than at 0.
 */
export function utcEndHourOf(entry: { startTime: string | Date; endTime: string | Date }) {
	const durationHours =
		(new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 3_600_000;
	return utcHourOf(entry.startTime) + durationHours;
}

/**
 * The whole hours a day view spans: from the earliest start down to the latest end up, or 8 to 18
 * for a day without entries.
 */
export function hourRange(
	entries: readonly { startTime: string | Date; endTime: string | Date }[]
) {
	if (entries.length === 0) return { startHour: 8, endHour: 18 };
	const earliest = Math.min(...entries.map((entry) => utcHourOf(entry.startTime)));
	const latest = Math.max(...entries.map(utcEndHourOf));
	return { startHour: Math.floor(earliest), endHour: Math.ceil(latest) };
}
