import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

/** Stands in for the URL: every parameter both `queryParameters` objects hold, in one place. */
const url: Record<string, unknown> = $state({});

vi.mock('sveltekit-search-params', async (importOriginal) => ({
	...(await importOriginal<typeof import('sveltekit-search-params')>()),
	queryParameters: () => url
}));

const { createTableState } = await import('./tableState.svelte');
type Options = Parameters<typeof createTableState>[0];

let cleanup = () => {};
function setup(options?: Options) {
	let state!: ReturnType<typeof createTableState>;
	cleanup = $effect.root(() => {
		state = createTableState(options);
	});
	return state;
}

beforeEach(() => {
	for (const key of Object.keys(url)) delete url[key];
});
afterEach(() => cleanup());

describe('createTableState', () => {
	test('opens with the defaults', () => {
		const state = setup({
			initialSorting: [{ id: 'name', desc: false }],
			defaultFilters: () => [{ id: 'hidden', value: false }]
		});
		expect(state.searchKey).toBe('filter');
		expect(state.search).toBe('');
		expect(state.sorting).toEqual([{ id: 'name', desc: false }]);
		expect(state.pagination).toEqual({ pageIndex: 0, pageSize: 50 });
		expect(state.columnFilters).toEqual([{ id: 'hidden', value: false }]);
	});

	test('reads what the URL holds', () => {
		Object.assign(url, {
			q: 'anna',
			sort: [{ id: 'school', desc: true }],
			page: 3,
			size: 20,
			filters: [{ id: 'school', value: 'x' }]
		});
		const state = setup({ searchKey: 'q', defaultFilters: [{ id: 'hidden', value: false }] });
		expect(state.typedSearch).toBe('anna');
		expect(state.search).toBe('anna');
		expect(state.sorting).toEqual([{ id: 'school', desc: true }]);
		expect(state.pagination).toEqual({ pageIndex: 2, pageSize: 20 });
		expect(state.columnFilters).toEqual([{ id: 'school', value: 'x' }]);
	});

	test('a search replaces the default sorting', () => {
		url.filter = 'anna';
		const state = setup({ initialSorting: [{ id: 'name', desc: false }] });
		expect(state.defaultSorting).toEqual([]);
		expect(state.columnFilters).toEqual([]);
	});

	test('searching resets sorting and page; an empty search leaves the URL', () => {
		Object.assign(url, { sort: [{ id: 'x', desc: false }], page: 2 });
		const state = setup();
		state.setSearch('anna');
		expect(url).toMatchObject({ filter: 'anna', sort: null, page: null });
		state.setSearch('');
		expect(url.filter).toBeNull();
	});

	test('setting the defaults leaves them out of the URL', () => {
		const state = setup({ initialSorting: [{ id: 'name', desc: false }], pageSize: 25 });
		state.setSorting([{ id: 'name', desc: false }]);
		expect(url.sort).toBeNull();
		state.setSorting([{ id: 'name', desc: true }]);
		expect(url.sort).toEqual([{ id: 'name', desc: true }]);
		state.setPagination({ pageIndex: 0, pageSize: 25 });
		expect(url).toMatchObject({ page: null, size: null });
		state.setPagination({ pageIndex: 1, pageSize: 100 });
		expect(url).toMatchObject({ page: 2, size: 100 });
	});

	test('changing the filters goes back to the first page', () => {
		const state = setup();
		url.page = 4;
		state.setColumnFilters([{ id: 'school', value: 'x' }]);
		expect(url).toMatchObject({ filters: [{ id: 'school', value: 'x' }], page: null });
		url.page = 4;
		state.resetFilters();
		expect(url).toMatchObject({ filters: null, page: null });
	});
});
