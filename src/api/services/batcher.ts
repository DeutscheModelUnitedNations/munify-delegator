/**
 * Collects the keys asked for within one turn of the event loop and loads them together, for a
 * field that is resolved once per row of a list (a chat's unread count) and would otherwise ask
 * the database once per row.
 */
export function createBatcher<V>(loadMany: (keys: string[]) => Promise<Map<string, V>>) {
	let pending: Map<string, Promise<V | undefined>> | undefined;
	let flush: Promise<Map<string, V>> | undefined;

	return (key: string): Promise<V | undefined> => {
		if (!pending || !flush) {
			const keys = new Map<string, Promise<V | undefined>>();
			pending = keys;
			flush = new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => {
				pending = undefined;
				flush = undefined;
				return loadMany([...keys.keys()]);
			});
		}
		const known = pending.get(key);
		if (known) return known;
		const value = flush.then((loaded) => loaded.get(key));
		pending.set(key, value);
		return value;
	};
}
