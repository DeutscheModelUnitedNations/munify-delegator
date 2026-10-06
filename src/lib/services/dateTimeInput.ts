/**
 * Conversions between `Date` values and the strings used by native
 * `<input type="date">` / `<input type="datetime-local">` elements.
 *
 * Native date inputs only ever exchange wall-clock strings without any timezone
 * information ("2026-02-20T09:00"). Posting such a string to the server makes it
 * parse the value in the *server's* timezone, which silently shifts the instant on
 * every save. `dateToFormValue` therefore produces an absolute ISO instant that is
 * unambiguous no matter which timezone the server runs in.
 */

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/**
 * Renders a `Date` for a native date input.
 *
 * Date-only values are stored as UTC midnight, so they are rendered from the UTC
 * calendar date - rendering them in the browser timezone would move them to the
 * previous day for anyone west of UTC. Datetime values use the browser's wall
 * clock, which is what `datetime-local` inputs represent.
 */
export function dateToInputValue(date: Date | undefined, enableTime: boolean): string {
	if (!date || Number.isNaN(date.getTime())) return '';
	if (!enableTime) return date.toISOString().slice(0, 10);
	return (
		`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
		`T${pad(date.getHours())}:${pad(date.getMinutes())}`
	);
}

/**
 * Parses the value of a native date input back into a `Date`.
 *
 * Date-only values are pinned to UTC midnight so they stay on the entered day
 * regardless of the browser timezone; datetime values are interpreted in the
 * browser timezone, mirroring `dateToInputValue`.
 */
export function inputValueToDate(value: string, enableTime: boolean): Date | undefined {
	if (!value) return undefined;
	const date = new Date(enableTime ? value : `${value}T00:00:00.000Z`);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Serializes a `Date` for submission to the server as an absolute instant.
 */
export function dateToFormValue(date: Date | undefined): string {
	if (!date || Number.isNaN(date.getTime())) return '';
	return date.toISOString();
}
