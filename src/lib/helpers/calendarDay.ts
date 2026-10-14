/**
 * A calendar day without a time, such as a birthday, travels as rumble's `Date` scalar: the
 * client sends the UTC day of the `Date` it is given (`YYYY-MM-DD`) and reads one back as UTC
 * midnight. A date picker yields the browser's local midnight instead, which lies on the previous
 * UTC day anywhere east of Greenwich - so convert at the boundary in both directions.
 */

/** The picked local day as the UTC midnight the `Date` scalar sends. */
export function toCalendarDay(local: Date): Date {
	return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
}

/** A `Date` scalar value (UTC midnight) as the local midnight a date picker shows. */
export function fromCalendarDay(day: Date): Date {
	return new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
}
