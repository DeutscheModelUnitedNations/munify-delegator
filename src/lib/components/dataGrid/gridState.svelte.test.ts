import { describe, expect, it } from 'vitest';
import { nextSorting } from './gridState.svelte';

describe('nextSorting', () => {
	it('cycles a column through ascending, descending and unsorted', () => {
		const asc = nextSorting({ sorting: [], id: 'a', multi: false });
		expect(asc).toEqual([{ id: 'a', desc: false }]);
		const desc = nextSorting({ sorting: asc, id: 'a', multi: false });
		expect(desc).toEqual([{ id: 'a', desc: true }]);
		expect(nextSorting({ sorting: desc, id: 'a', multi: false })).toEqual([]);
	});

	it('replaces the sorting without shift, adds to it with', () => {
		const byA = [{ id: 'a', desc: false }];
		expect(nextSorting({ sorting: byA, id: 'b', multi: false })).toEqual([
			{ id: 'b', desc: false }
		]);
		expect(nextSorting({ sorting: byA, id: 'b', multi: true })).toEqual([
			{ id: 'a', desc: false },
			{ id: 'b', desc: false }
		]);
	});

	it('keeps a column’s place when shift turns it around, and drops it at the end', () => {
		const both = [
			{ id: 'a', desc: false },
			{ id: 'b', desc: false }
		];
		expect(nextSorting({ sorting: both, id: 'a', multi: true })).toEqual([
			{ id: 'a', desc: true },
			{ id: 'b', desc: false }
		]);
		expect(
			nextSorting({ sorting: [{ id: 'a', desc: true }, both[1]], id: 'a', multi: true })
		).toEqual([{ id: 'b', desc: false }]);
	});
});

describe('createGridState', async () => {
	const { createGridState } = await import('./gridState.svelte');
	const { baseState } = await import('#lib/dataGrid/tableState');

	type Row = { id: string };
	const columns = [
		{ id: 'name', type: 'text' as const, label: 'Name', alwaysVisible: true },
		{ id: 'city', type: 'text' as const, label: 'City' },
		{ id: 'age', type: 'number' as const, label: 'Age', defaultVisible: false }
	];
	const base = baseState({ sorting: [{ id: 'name', desc: false }] });
	const savedView = {
		id: 'v1',
		name: 'View',
		state: { ...base, pageSize: 100 },
		shared: false,
		global: false,
		mine: true,
		isDefault: false,
		isMyDefault: false
	};

	const create = () => {
		let changes = 0;
		const grid = createGridState<Row>({
			columns: () => columns,
			initial: { view: null, saved: base, state: structuredClone(base), search: '', page: 3 },
			views: () => [savedView],
			rowId: (row) => row.id,
			onChange: () => changes++
		});
		return { grid, changes: () => changes };
	};

	it('edits the state, goes back to page 1 where rows change, and tells about it', () => {
		const { grid, changes } = create();
		expect(grid.pageIndex).toBe(2);
		grid.setVisible({ id: 'age', visible: true });
		expect(grid.pageIndex).toBe(2);
		expect(grid.visibleColumns.map((column) => column.id)).toEqual(['name', 'city', 'age']);
		grid.toggleSort({ id: 'city', multi: false });
		expect(grid.pageIndex).toBe(0);
		expect(grid.state.sorting).toEqual([{ id: 'city', desc: false }]);
		expect(grid.dirty).toBe(true);
		expect(changes()).toBe(2);
	});

	it('asks with the source revision, so a row added elsewhere is fetched', async () => {
		const { pageRequest } = await import('./pageRequest');
		let revision = 'a';
		const grid = createGridState<Row>({
			columns: () => columns,
			initial: { view: null, saved: base, state: structuredClone(base), search: '', page: 1 },
			views: () => [],
			rowId: (row) => row.id,
			revision: () => revision
		});
		expect(pageRequest({ grid, pageIndex: 0 }).revision).toBe('a');
		revision = 'a,b';
		expect(pageRequest({ grid, pageIndex: 0 }).revision).toBe('a,b');
	});

	it('moves and resizes columns, but never the pinned one', () => {
		const { grid } = create();
		grid.moveColumn({ id: 'city', delta: -1 });
		expect(grid.visibleColumns.map((column) => column.id)).toEqual(['name', 'city']);
		grid.resize({ id: 'city', width: 10 });
		expect(grid.state.sizes.city).toBe(40);
		grid.resetSizes();
		expect(grid.state.sizes).toEqual({});
	});

	it('opens and closes groups, and all of them at once', () => {
		const { grid } = create();
		grid.setGrouping([{ column: 'city' }]);
		expect(grid.isGroupOpen(['Kiel'])).toBe(true);
		grid.toggleGroup(['Kiel']);
		expect(grid.isGroupOpen(['Kiel'])).toBe(false);
		grid.collapseAll();
		expect(grid.isGroupOpen(['Bonn'])).toBe(false);
		grid.expandAll();
		expect(grid.isGroupOpen(['Kiel'])).toBe(true);
	});

	it('keeps the selected rows whole', () => {
		const { grid } = create();
		grid.setSelected({ rows: [{ id: 'a' }, { id: 'b' }], selected: true });
		grid.setSelected({ rows: [{ id: 'a' }], selected: false });
		expect(grid.selectedCount).toBe(1);
		expect(grid.selectedRows).toEqual([{ id: 'b' }]);
		expect(grid.isSelected({ id: 'b' })).toBe(true);
		grid.clearSelection();
		expect(grid.selectedCount).toBe(0);
	});

	it('switches views, saves and discards', () => {
		const { grid } = create();
		grid.selectView({ next: savedView, base });
		expect(grid.view?.id).toBe('v1');
		expect(grid.state.pageSize).toBe(100);
		grid.setPageSize(20);
		expect(grid.dirty).toBe(true);
		grid.discard();
		expect(grid.state.pageSize).toBe(100);
		grid.setPageSize(20);
		grid.markSaved('v1');
		expect(grid.dirty).toBe(false);
		grid.selectView({ next: null, base });
		expect(grid.view).toBeNull();
		expect(grid.snapshot().pageSize).toBe(base.pageSize);
	});

	it('hands the queries the filter, sorting and grouping a task later', async () => {
		const { grid } = create();
		grid.setGrouping([{ column: 'city' }]);
		expect(grid.query().grouping).toEqual([]);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(grid.query(['Kiel'])).toMatchObject({ grouping: [{ column: 'city' }], path: ['Kiel'] });
	});
});
