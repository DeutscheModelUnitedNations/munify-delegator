import { SvelteMap } from 'svelte/reactivity';

/** How long a card waits for the board to show its change before it is freed anyway. */
const SETTLE_TIMEOUT = 10_000;

/**
 * The cards on the assignment board with a change on its way. A card counts as moving from the
 * moment it is dropped until the board shows it somewhere else: the mutation answers before the
 * live queries have caught up, and a card that looked settled in its old place would then jump.
 * `placeOf` says where the board shows a card now; any value that differs counts as moved.
 */
export function createPendingMoves(placeOf: (key: string) => string) {
	const from = new SvelteMap<string, string>();

	return {
		has(key: string) {
			return from.has(key);
		},

		get size() {
			return from.size;
		},

		/** Marks `key` as moving while `change` runs; a change that fails (false) frees it at once. */
		async track(key: string, change: () => Promise<boolean>) {
			from.set(key, placeOf(key));
			if (await change()) setTimeout(() => from.delete(key), SETTLE_TIMEOUT);
			else from.delete(key);
		},

		/** Frees the cards the board shows somewhere else by now. Run it in an effect. */
		settle() {
			for (const [key, origin] of from) {
				if (placeOf(key) !== origin) from.delete(key);
			}
		}
	};
}

export type PendingMoves = ReturnType<typeof createPendingMoves>;
