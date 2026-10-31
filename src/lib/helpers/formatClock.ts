import { getLocale } from '#lib/paraglide/runtime';

/** Calendar times are UTC wall-clock times, so they are shown in UTC, in the app's locale. */
const formatter = (locale: string) =>
	new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

/** A calendar time (a UTC wall-clock time) in the user's selected locale, e.g. `09:00` or `9:00 AM`. */
export function formatClock({
	time,
	locale = getLocale()
}: {
	time: Date | string;
	locale?: string;
}) {
	return formatter(locale).format(new Date(time));
}

/** Minutes since midnight (`540`) in the user's selected locale. */
export function formatClockMinutes({
	minutes,
	locale = getLocale()
}: {
	minutes: number;
	locale?: string;
}) {
	return formatter(locale).format(new Date(Date.UTC(1970, 0, 1, 0, minutes)));
}
