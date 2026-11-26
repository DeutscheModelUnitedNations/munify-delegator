/** How far back the bank payment sync looks at most, also on its first run. */
export const DEFAULT_LOOKBACK_DAYS = 60;

/** The calendar day `days` before `now`, as `YYYY-MM-DD` (UTC). */
export function lookbackStart({ now, days }: { now: Date; days: number }) {
	const start = new Date(now);
	start.setUTCDate(start.getUTCDate() - days);
	return start.toISOString().slice(0, 10);
}
