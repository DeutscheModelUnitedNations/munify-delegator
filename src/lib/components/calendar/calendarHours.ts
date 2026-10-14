/** The hour of the day (UTC) a time falls on, as a fraction: 9:30 is 9.5. */
export function utcHourOf(time: string | Date) {
	const date = new Date(time);
	return date.getUTCHours() + date.getUTCMinutes() / 60;
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
	const latest = Math.max(...entries.map((entry) => utcHourOf(entry.endTime)));
	return { startHour: Math.floor(earliest), endHour: Math.ceil(latest) };
}
