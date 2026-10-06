import { parseSizeLimits, type SizeLimits } from '$lib/services/seatPlanning/hints';

/**
 * Min/max delegation size of the seat planning. Only a planning aid, so it lives in the browser
 * (per conference) instead of the database.
 */
export class SizeLimitsStore implements SizeLimits {
	min = $state<number | null>(null);
	max = $state<number | null>(null);
	#key: string;

	constructor(conferenceId: string) {
		this.#key = `seatPlanningSizeLimits:${conferenceId}`;
	}

	/** call on mount, the server has no access to the browser storage */
	load() {
		try {
			this.#apply(parseSizeLimits(JSON.parse(localStorage.getItem(this.#key) ?? 'null')));
		} catch {
			// unavailable or corrupt storage: start without limits
		}
	}

	set(limits: SizeLimits) {
		this.#apply(parseSizeLimits(limits));
		try {
			localStorage.setItem(this.#key, JSON.stringify({ min: this.min, max: this.max }));
		} catch {
			// the limits still apply for this visit
		}
	}

	#apply({ min, max }: SizeLimits) {
		this.min = min;
		this.max = max;
	}
}
