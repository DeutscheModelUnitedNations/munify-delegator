import { m } from '$lib/paraglide/messages';

/** Steps from seconds up to days: each unit's size in the previous one, and its message. */
const units: { per: number; format: (count: number) => string }[] = [
	{ per: 60, format: (count) => m.timeAgoSeconds({ count }) },
	{ per: 60, format: (count) => m.timeAgoMinutes({ count }) },
	{ per: 24, format: (count) => m.timeAgoHours({ count }) },
	{ per: Infinity, format: (count) => m.timeAgoDays({ count }) }
];

/** How long ago `timestamp` was, in the largest whole unit below the next; empty without one. */
export function formatRelativeTime(timestamp: number | undefined, now = Date.now()): string {
	if (!timestamp) return '';
	let count = Math.floor((now - timestamp) / 1000);
	for (const unit of units) {
		if (count < unit.per) return unit.format(count);
		count = Math.floor(count / unit.per);
	}
	return '';
}
