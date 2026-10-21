import { parseSizeLimits, type SizeLimits } from '#lib/helpers/seatPlanning/hints.js';

/**
 * Min/max delegation size of the seat planning. Only a planning aid, so it lives in the browser
 * (per conference) instead of the database.
 */
export function createSizeLimitsStore(conferenceId: string) {
	const key = `seatPlanningSizeLimits:${conferenceId}`;
	let min = $state<number | null>(null);
	let max = $state<number | null>(null);

	function apply(limits: SizeLimits) {
		min = limits.min;
		max = limits.max;
	}

	return {
		get min() {
			return min;
		},
		get max() {
			return max;
		},

		/** call on mount, the server has no access to the browser storage */
		load() {
			try {
				apply(parseSizeLimits(JSON.parse(localStorage.getItem(key) ?? 'null')));
			} catch {
				// unavailable or corrupt storage: start without limits
			}
		},

		set(limits: SizeLimits) {
			apply(parseSizeLimits(limits));
			try {
				localStorage.setItem(key, JSON.stringify({ min, max }));
			} catch {
				// the limits still apply for this visit
			}
		}
	};
}

export type SizeLimitsStore = ReturnType<typeof createSizeLimitsStore>;
