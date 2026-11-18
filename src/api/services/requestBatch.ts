/**
 * Collects the keys a request asks for within one turn of the event loop and loads them together:
 * a field resolved for every row of a list (every card of a board, every member of every
 * delegation) costs one `load` instead of one per row. Batches are per request (`ctx`), so callers
 * never share results.
 */
export function requestBatch<Ctx extends object, T>(
	load: (args: { ctx: Ctx; keys: string[] }) => Promise<Map<string, T>>
) {
	const pending = new WeakMap<Ctx, { keys: Set<string>; loaded: Promise<Map<string, T>> }>();
	return function get({ ctx, key }: { ctx: Ctx; key: string }): Promise<T | undefined> {
		let batch = pending.get(ctx);
		if (!batch) {
			const keys = new Set<string>();
			// a macrotask, so fields resolved after awaiting their parents still join the batch
			const loaded = new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => {
				pending.delete(ctx);
				return load({ ctx, keys: [...keys] });
			});
			batch = { keys, loaded };
			pending.set(ctx, batch);
		}
		batch.keys.add(key);
		return batch.loaded.then((results) => results.get(key));
	};
}
