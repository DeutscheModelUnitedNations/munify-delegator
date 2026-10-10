import { keepWhileEqual } from '$lib/helpers/memoizeLast';

/**
 * A plain copy of a live query result's rows, for a page that works over them a lot. Read it in
 * its own `$derived`: every property read on a live result subscribes the reader once more (a
 * render effect each), so spreading one row by row costs as many subscriptions as it has rows,
 * every time the derived runs. `slice` is a single read (it runs on the rows themselves), and an
 * equal copy keeps the previous array, so deriveds over it only run again for real changes.
 *
 * Create one per result and keep it: it remembers the last copy.
 */
export function liveSnapshot<T>() {
	const keep = keepWhileEqual<T[]>();
	return (live: { slice(): T[] }) => keep(live.slice());
}
