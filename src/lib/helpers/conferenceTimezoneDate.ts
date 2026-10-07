/**
 * Converts a datetime-local input value (e.g. "2026-02-20T18:00")
 * into a Date object as if the time was specified in the given timezone.
 *
 * datetime-local inputs produce strings without timezone info.
 * `new Date("2026-02-20T18:00")` interprets them in the browser's local timezone.
 * This function instead interprets the value in the conference timezone.
 */
export function datetimeLocalToDate(datetimeLocal: string, timezone: string): Date {
	const [datePart, timePart] = datetimeLocal.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	const [hours, minutes] = timePart.split(':').map(Number);
	const desiredWallMs = Date.UTC(year, month - 1, day, hours, minutes);

	// Compute the UTC time that produces the desired wall-clock time in the
	// target timezone. A single-pass offset lookup can be wrong by up to ±1 h
	// when the tentative time and the result straddle a DST transition, so we
	// run a second pass to correct for that.
	let result = new Date(desiredWallMs - getOffsetMs(new Date(desiredWallMs), timezone));
	const secondOffset = getOffsetMs(result, timezone);
	const firstOffset = getOffsetMs(new Date(desiredWallMs), timezone);
	if (secondOffset !== firstOffset) {
		result = new Date(desiredWallMs - secondOffset);
	}
	return result;
}

/** Returns the UTC-offset (in ms) of `timezone` at the given instant. */
function getOffsetMs(instant: Date, timezone: string): number {
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

	const parts = formatter.formatToParts(instant);
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((p) => p.type === type)?.value ?? 0);

	const wallMs = Date.UTC(
		get('year'),
		get('month') - 1,
		get('day'),
		get('hour') === 24 ? 0 : get('hour'),
		get('minute'),
		get('second')
	);
	return wallMs - instant.getTime();
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
