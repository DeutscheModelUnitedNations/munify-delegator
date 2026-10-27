import { POOL_PAGE, type PoolPage } from './board';
import { toastError } from './toastError';

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

/** The pool `source` currently names: its key, and how to fetch one of its pages. */
interface PoolSource<T> {
	key: string;
	fetchPage: (page: number) => Promise<PoolPage<T>>;
}

/**
 * The pool a board shows: loads the first page of whatever `source` names whenever that changes,
 * and the next page on `loadMore`. Failures are toasted. Call it while a component is created.
 */
export function createPool<T>(source: () => PoolSource<T>) {
	const loader = createPoolPages<T>();
	$effect(() => {
		const { key, fetchPage } = source();
		loader.load(key, fetchPage).catch(toastError);
	});
	const pages = () => loader.pages(source().key);
	return {
		/** The pages loaded so far */
		get pages() {
			return pages();
		},
		/** Whether the first page is still on its way */
		get loading() {
			return loader.pending(source().key);
		},
		/** Whether there may be more to load */
		get more() {
			return poolHasMore(pages().at(-1));
		},
		loadMore() {
			const { key, fetchPage } = source();
			loader.loadMore(key, fetchPage).catch(toastError);
		}
	};
}

/** Whether a pool whose last page is `last` may have more to load. */
export function poolHasMore(last: PoolPage<unknown> | undefined) {
	return last?.rows.length === POOL_PAGE;
}

/** How long typing has to pause before the pool is asked for what was typed. */
const SEARCH_DELAY_MS = 250;

/**
 * The search of a pool: what is typed, and the term the pool is asked for once typing pauses, so
 * not every keystroke loads the pool afresh. Call it while a component is created.
 */
export function createPoolSearch() {
	let typed = $state('');
	let term = $state('');
	$effect(() => {
		const next = typed.trim();
		const timer = setTimeout(() => (term = next), SEARCH_DELAY_MS);
		return () => clearTimeout(timer);
	});
	return {
		get typed() {
			return typed;
		},
		set typed(value: string) {
			typed = value;
		},
		/** The term the pool is filtered by; empty for none */
		get term() {
			return term;
		},
		/** Whether what is typed is not what the pool shows yet */
		get settling() {
			return typed.trim() !== term;
		}
	};
}

/** The groups of a pool that are on its loaded pages: while searching, only those are matches. */
export function onPages<
	G extends { delegationId?: string | null; singleParticipantId: string | null }
>(groups: readonly G[], pages: readonly PoolPage<{ id: string }>[]) {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a lookup built per call, never mutated
	const ids = new Set(pages.flatMap((page) => page.rows.map((row) => row.id)));
	return groups.filter((group) => ids.has(group.delegationId ?? group.singleParticipantId ?? ''));
}
