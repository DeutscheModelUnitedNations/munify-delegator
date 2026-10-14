import { POOL_PAGE, type PoolPage } from './board';

/**
 * The loaded pages of a pool. Each page is fetched once and appended; nothing already loaded is
 * asked for or read again, so a long pool stays as quick as a short one. The pages belong to one
 * `key` (the conference and whatever filters the pool); another key starts over.
 *
 * Loaded imperatively rather than through `$derived(await …)`: switching the key (another group
 * size) would otherwise leave an async batch pending while the board swaps its role cards, and an
 * update landing in between trips Svelte's "Batch has scheduled effects" invariant. Results are
 * written after their `await`, outside any commit.
 */
export function createPoolPages<T>() {
	let loaded = $state.raw<{ key: string; pages: PoolPage<T>[] }>({ key: '', pages: [] });
	let loading: string | undefined;

	return {
		/** The pages loaded for `key`, none while it is being loaded. */
		pages(key: string) {
			return loaded.key === key ? loaded.pages : [];
		},

		/** Whether the first page of `key` is still on its way. */
		pending(key: string) {
			return loaded.key !== key;
		},

		/** Loads the first page of `key`, unless it is loaded or loading. A later key wins. */
		async load(key: string, fetchPage: (page: number) => Promise<PoolPage<T>>) {
			if (loaded.key === key || loading === key) return;
			loading = key;
			try {
				const page = await fetchPage(0);
				if (loading === key) loaded = { key, pages: [page] };
			} finally {
				if (loading === key) loading = undefined;
			}
		},

		/** Loads the page after those loaded for `key`; one at a time, and only for the current key. */
		async loadMore(key: string, fetchPage: (page: number) => Promise<PoolPage<T>>) {
			if (loading !== undefined || loaded.key !== key) return;
			loading = key;
			try {
				const page = await fetchPage(loaded.pages.length);
				if (loaded.key === key) loaded = { key, pages: [...loaded.pages, page] };
			} finally {
				if (loading === key) loading = undefined;
			}
		}
	};
}

type PoolPages<T> = ReturnType<typeof createPoolPages<T>>;

/** Whether a pool whose last page is `last` may have more to load. */
export function poolHasMore(last: PoolPage<unknown> | undefined) {
	return last?.rows.length === POOL_PAGE;
}
