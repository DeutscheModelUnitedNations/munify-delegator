import { m } from '#lib/paraglide/messages';
import { getLocale } from '#lib/paraglide/runtime';

/**
 * How fresh figures from the statistics are, for a widget's note: the statistics are recomputed by
 * a job, so they lag the data. Undefined before the first refresh.
 */
export function freshness(refreshedAt: Date | string | null | undefined) {
	if (!refreshedAt) return undefined;
	const time = new Date(refreshedAt).toLocaleString(getLocale(), {
		dateStyle: 'short',
		timeStyle: 'short'
	});
	return m.teamWidgetStatsAsOf({ time });
}
