import { SvelteMap } from 'svelte/reactivity';

/** How long a card waits for the board to show its change before it is freed anyway. */
const SETTLE_TIMEOUT = 10_000;

/**
 * The cards on the assignment board with a change on its way. A card counts as moving from the
 * moment it is dropped until the board shows it somewhere else: the mutation answers before the
 * live queries have caught up, and a card that looked settled in its old place would then jump.
 * `placeOf` says where the board shows a card now; any value that differs counts as moved.
 */
export class PendingMoves {
	readonly #from = new SvelteMap<string, string>();
	readonly #placeOf: (key: string) => string;

	constructor(placeOf: (key: string) => string) {
		this.#placeOf = placeOf;
	}

	has(key: string) {
		return this.#from.has(key);
	}

	get size() {
		return this.#from.size;
	}

	/** Marks `key` as moving while `change` runs; a change that fails (false) frees it at once. */
	async track(key: string, change: () => Promise<boolean>) {
		this.#from.set(key, this.#placeOf(key));
		if (await change()) setTimeout(() => this.#from.delete(key), SETTLE_TIMEOUT);
		else this.#from.delete(key);
	}

	/** Frees the cards the board shows somewhere else by now. Run it in an effect. */
	settle() {
		for (const [key, from] of this.#from) {
			if (this.#placeOf(key) !== from) this.#from.delete(key);
		}
	}
}
