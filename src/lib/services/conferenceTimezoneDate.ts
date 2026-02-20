/**
 * Converts a datetime-local input value (e.g. "2026-02-20T18:00")
 * into a Date object as if the time was specified in the given timezone.
 *
 * datetime-local inputs produce strings without timezone info.
 * `new Date("2026-02-20T18:00")` interprets them in the browser's local timezone.
 * This function instead interprets the value in the conference timezone.
 */
export function datetimeLocalToDate(datetimeLocal: string, timezone: string): Date {
	// Parse the components from the datetime-local string
	const [datePart, timePart] = datetimeLocal.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	const [hours, minutes] = timePart.split(':').map(Number);

	// Create a date in UTC, then adjust by the timezone offset
	// First, find what UTC time corresponds to this wall-clock time in the target timezone
	// We do this by creating a tentative UTC date and computing the offset
	const tentative = new Date(Date.UTC(year, month - 1, day, hours, minutes));

	// Get the offset of the target timezone at this tentative time
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});

	const parts = formatter.formatToParts(tentative);
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((p) => p.type === type)?.value ?? 0);

	const tzYear = get('year');
	const tzMonth = get('month');
	const tzDay = get('day');
	const tzHour = get('hour') === 24 ? 0 : get('hour');
	const tzMinute = get('minute');

	const tzWallMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute);
	const offsetMs = tzWallMs - tentative.getTime();

	// The actual UTC time = desired wall-clock time - offset
	return new Date(Date.UTC(year, month - 1, day, hours, minutes) - offsetMs);
}

/**
 * Converts a Date object to a datetime-local string (e.g. "2026-02-20T18:00")
 * representing the wall-clock time in the given timezone.
 */
export function dateToDatetimeLocal(date: Date, timezone: string): string {
	const formatter = new Intl.DateTimeFormat('en-US', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});

	const parts = formatter.formatToParts(date);
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((p) => p.type === type)?.value ?? '00';

	const y = get('year');
	const mo = get('month');
	const d = get('day');
	const h = get('hour') === '24' ? '00' : get('hour');
	const mi = get('minute');

	return `${y}-${mo}-${d}T${h}:${mi}`;
}

/**
 * Formats a Date for display in the conference timezone.
 */
export function formatInTimezone(date: Date, timezone: string): string {
	return date.toLocaleString(undefined, {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short'
	});
}
