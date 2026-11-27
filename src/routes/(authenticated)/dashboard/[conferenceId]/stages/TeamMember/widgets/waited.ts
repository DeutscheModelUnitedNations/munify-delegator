import { getLocale } from '#lib/paraglide/runtime';

/**
 * How long something has waited, in the largest whole unit that fits ("12 Minuten", "3 Stunden",
 * "2 Tage"), for "waits for …". Under a minute counts as one.
 */
export function waitedFor({ since, now }: { since: Date; now: Date }) {
	const minutes = Math.max(1, Math.floor((now.getTime() - since.getTime()) / 60_000));
	const format = (value: number, unit: 'minute' | 'hour' | 'day') =>
		new Intl.NumberFormat(getLocale(), { style: 'unit', unit, unitDisplay: 'long' }).format(value);
	if (minutes < 60) return format(minutes, 'minute');
	const hours = Math.floor(minutes / 60);
	if (hours < 48) return format(hours, 'hour');
	return format(Math.floor(hours / 24), 'day');
}
