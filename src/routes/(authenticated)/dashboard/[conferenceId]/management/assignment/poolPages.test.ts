import { describe, expect, it, vi } from 'vitest';
import { POOL_PAGE, type PoolPage } from './board';
import { PoolPages } from './poolPages.svelte';

vi.mock('$lib/api/rumbleClient/client', () => ({ client: {} }));

type Row = { id: string };
const page = (size: number, from = 0): PoolPage<Row> => ({
	rows: Array.from({ length: size }, (_, i) => ({ id: `r${from + i}` })),
	reviews: []
});
const deferred = () => {
	let resolve: (value: PoolPage<Row>) => void = () => {};
	const promise = new Promise<PoolPage<Row>>((r) => (resolve = r));
	return { promise, resolve };
};

describe('PoolPages', () => {
	it('loads the first page of a key once, then appends the following ones', async () => {
		const fetchPage = vi.fn(async (index: number) => page(2, index * 2));
		const pages = new PoolPages<Row>();
		expect(pages.pending('c')).toBe(true);
		await pages.load('c', fetchPage);
		await pages.load('c', fetchPage);
		await pages.loadMore('c', fetchPage);
		await pages.loadMore('c', fetchPage);
		expect(fetchPage.mock.calls).toEqual([[0], [1], [2]]);
		expect(pages.pending('c')).toBe(false);
		expect(pages.pages('c').map((loaded) => loaded.rows[0].id)).toEqual(['r0', 'r2', 'r4']);
	});

	it('loads one page at a time', async () => {
		const pages = new PoolPages<Row>();
		await pages.load('c', async () => page(1));
		const next = deferred();
		const fetchPage = vi.fn(() => next.promise);
		const first = pages.loadMore('c', fetchPage);
		await pages.loadMore('c', fetchPage);
		next.resolve(page(1));
		await first;
		expect(fetchPage).toHaveBeenCalledTimes(1);
		expect(pages.pages('c')).toHaveLength(2);
	});

	it('starts over for another key, and the latest key wins', async () => {
		const pages = new PoolPages<Row>();
		const slow = deferred();
		const first = pages.load('a', () => slow.promise);
		await pages.load('b', async () => page(1, 10));
		slow.resolve(page(1));
		await first;
		expect(pages.pending('a')).toBe(true);
		expect(pages.pages('b').map((loaded) => loaded.rows[0].id)).toEqual(['r10']);
	});

	it('only loads more for the key that is shown', async () => {
		const pages = new PoolPages<Row>();
		const fetchPage = vi.fn(async () => page(1));
		await pages.loadMore('c', fetchPage);
		expect(fetchPage).not.toHaveBeenCalled();
	});

	it('frees itself after a failed page', async () => {
		const pages = new PoolPages<Row>();
		await expect(pages.load('c', () => Promise.reject(new Error('offline')))).rejects.toThrow(
			'offline'
		);
		await pages.load('c', async () => page(1));
		expect(pages.pages('c')).toHaveLength(1);
	});

	it('has more only after a full page', () => {
		expect(PoolPages.more(page(POOL_PAGE))).toBe(true);
		expect(PoolPages.more(page(POOL_PAGE - 1))).toBe(false);
		expect(PoolPages.more(undefined)).toBe(false);
	});
});
